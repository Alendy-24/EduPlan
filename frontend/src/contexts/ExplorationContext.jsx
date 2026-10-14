import { offerIsSelected } from '../utils/program-search';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { browserStorage, readStorage, writeStorage } from '../utils/storage';
import { addComparison, validStoredProgram } from '../utils/programs';
import { validSavedItem, mergeRemoteSaved } from '../utils/saved';
import { getSaved, putSaved, deleteSaved } from '../services/account';

const ExplorationContext = createContext(null);
function load(owner) {
  const storage = browserStorage();
  const saved = readStorage(storage, `eduplan-saved-v1-${owner}`, [], value => Array.isArray(value) && value.every(validSavedItem));
  if (owner === 'guest') {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith('eduplan-saved-') || key.startsWith('eduplan-saved-v1-') || key.startsWith('eduplan-saved-pending-') || key.startsWith('eduplan-saved-migrated-') || storage.getItem(key) !== 'true') continue;
        const id = key.slice('eduplan-saved-'.length).replace(/-aside$/, '');
        const type = id.startsWith('program-') ? 'program' : id.startsWith('institution-') ? 'institution' : 'opportunity';
        const slug = id.replace(/^(program|institution|opportunity)-/, '');
        if (!saved.some(item => item.id === id)) saved.push({ id, type, name: `Opción guardada: ${slug}`, href: type === 'program' ? `/programas/${encodeURIComponent(slug)}` : type === 'institution' ? `/instituciones/${encodeURIComponent(slug)}` : '/becas' });
      }
    } catch { /* unavailable storage: continue in memory */ }
  }
  return { saved, comparison: readStorage(storage, `eduplan-compare-v1-${owner}`, [], value => Array.isArray(value) && value.length <= 3 && value.every(validStoredProgram)) };
}
function validOperation(value) { return value && typeof value.id === 'string' && value.id.trim() && value.id.length <= 200 && !/[\\/]/.test(value.id) && !Array.from(value.id).some(character => character.charCodeAt(0) < 32) && (value.action === 'delete' || value.action === 'put' && validSavedItem(value.item) && value.item.id === value.id); }
function OwnerProvider({ owner, token, children }) {
  const [data, setData] = useState(() => load(owner));
  const [persistent, setPersistent] = useState(true);
  const [syncState, setSyncState] = useState(token ? 'loading' : 'local');
  const [syncError, setSyncError] = useState('');
  const savedRef = useRef(data.saved), controller = useRef(null), running = useRef(null), ready = useRef(false);
  const pendingKey = `eduplan-saved-pending-v1-${owner}`, migratedKey = `eduplan-saved-migrated-v1-${owner}`;
  const pending = useRef(new Map(readStorage(browserStorage(), pendingKey, [], value => Array.isArray(value) && value.every(validOperation)).map(operation => [operation.id, operation])));
  function setSaved(saved) { savedRef.current = saved; setData(current => ({ ...current, saved })); }
  function persistPending() { if (!writeStorage(browserStorage(), pendingKey, [...pending.current.values()])) setPersistent(false); }
  async function flush(signal) {
    if (!token || !ready.current || running.current && !running.current.aborted || signal.aborted) return;
    running.current = signal; setSyncState('saving'); setSyncError('');
    try {
      while (pending.current.size && !signal.aborted) {
        const operation = pending.current.values().next().value;
        const item = operation.action === 'delete' ? await deleteSaved(operation.id, token, signal) : await putSaved(operation.item, token, signal);
        if (signal.aborted) return;
        if (pending.current.get(operation.id) === operation) {
          pending.current.delete(operation.id); persistPending();
          if (item && validSavedItem(item)) setSaved(savedRef.current.map(value => value.id === item.id ? item : value));
        }
      }
      if (!signal.aborted) { writeStorage(browserStorage(), migratedKey, true); setSyncState('synced'); }
    } catch (error) { if (!signal.aborted) { setSyncState('error'); setSyncError(error.message); } }
    finally { if (running.current === signal) running.current = null; }
  }
  async function refresh(signal) {
    if (!token || signal.aborted || running.current && !running.current.aborted) return;
    ready.current = false; setSyncState('loading'); setSyncError('');
    try {
      const remote = await getSaved(token, signal);
      if (signal.aborted) return;
      if (!readStorage(browserStorage(), migratedKey, false, value => typeof value === 'boolean')) {
        // Only migrate the old cache belonging to this authenticated account.
        for (const item of savedRef.current) if (!remote.some(value => value.id === item.id) && !pending.current.has(item.id)) pending.current.set(item.id, { id: item.id, action: 'put', item });
        persistPending();
      }
      setSaved(mergeRemoteSaved(remote, [...pending.current.values()])); ready.current = true;
      await flush(signal);
    } catch (error) { if (!signal.aborted) { setSyncState('error'); setSyncError(error.message); } }
  }
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    if (token) refresh(request.signal);
    return () => { ready.current = false; request.abort(); };
  }, [owner, token]);
  useEffect(() => {
    const storage = browserStorage();
    const savedOk = writeStorage(storage, `eduplan-saved-v1-${owner}`, data.saved);
    const compareOk = writeStorage(storage, `eduplan-compare-v1-${owner}`, data.comparison);
    setPersistent(savedOk && compareOk);
    if (savedOk && owner === 'guest') {
      try { const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)); keys.filter(key => key?.startsWith('eduplan-saved-') && !key.startsWith('eduplan-saved-v1-') && !key.startsWith('eduplan-saved-pending-') && !key.startsWith('eduplan-saved-migrated-')).forEach(key => storage.removeItem(key)); } catch { /* retry migration on next visit */ }
    }
  }, [data, owner]);
  function changeSaved(item, remove) {
    if (syncState === 'loading') return;
    setSaved(remove ? savedRef.current.filter(value => value.id !== item.id) : [...savedRef.current.filter(value => value.id !== item.id), item]);
    if (token) {
      pending.current.set(item.id, remove ? { id: item.id, action: 'delete' } : { id: item.id, action: 'put', item }); persistPending();
      if (ready.current) flush(controller.current.signal);
      else setSyncError('Cambios pendientes de sincronizar. Reintenta cuando vuelva la conexión.');
    }
  }
  function toggleSaved(item) { changeSaved(item, savedRef.current.some(value => value.id === item.id)); }
  function removeSaved(id) { const item = savedRef.current.find(value => value.id === id); if (item) changeSaved(item, true); }
  function updateSaved(item) { changeSaved(item, false); }
  function toggleCompare(program) { setData(current => ({ ...current, comparison: current.comparison.some(p => offerIsSelected(p, program)) ? current.comparison.filter(p => !offerIsSelected(p, program)) : addComparison(current.comparison, program) })); }
  return <ExplorationContext.Provider value={{ ...data, persistent, syncState, syncError, retrySync: () => refresh(controller.current.signal), toggleSaved, removeSaved, updateSaved, toggleCompare, clearComparison: () => setData(current => ({ ...current, comparison: [] })) }}>{children}</ExplorationContext.Provider>;
}
export function ExplorationProvider({ children }) { const { user, token } = useAuth(); const owner = user ? `user-${user.id}` : 'guest'; return <OwnerProvider key={owner} owner={owner} token={token}>{children}</OwnerProvider>; }
export function useExploration() { return useContext(ExplorationContext); }
