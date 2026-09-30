import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { browserStorage, readStorage, writeStorage } from '../utils/storage';
import { addComparison, validStoredProgram } from '../utils/programs';
const ExplorationContext = createContext(null);
function validItem(item) { return item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.href === 'string' && item.href.startsWith('/') && !item.href.startsWith('//') && !item.href.includes('\\') && ['program','institution','opportunity'].includes(item.type); }
function load(owner) {
  const storage = browserStorage();
  const saved = readStorage(storage, `eduplan-saved-v1-${owner}`, [], value => Array.isArray(value) && value.every(validItem));
  if (owner === 'guest') {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith('eduplan-saved-') || key.startsWith('eduplan-saved-v1-') || storage.getItem(key) !== 'true') continue;
        const id = key.slice('eduplan-saved-'.length).replace(/-aside$/, '');
        const type = id.startsWith('program-') ? 'program' : id.startsWith('institution-') ? 'institution' : 'opportunity';
        const slug = id.replace(/^(program|institution|opportunity)-/, '');
        if (!saved.some(item => item.id === id)) saved.push({ id, type, name: `Opción guardada: ${slug}`, href: type === 'program' ? `/programas/${encodeURIComponent(slug)}` : type === 'institution' ? `/instituciones/${encodeURIComponent(slug)}` : '/becas' });
      }
    } catch { /* unavailable storage: continue in memory */ }
  }
  return { saved, comparison: readStorage(storage, `eduplan-compare-v1-${owner}`, [], value => Array.isArray(value) && value.length <= 3 && value.every(validStoredProgram)) };
}
function OwnerProvider({ owner, children }) {
  const [data, setData] = useState(() => load(owner));
  const [persistent, setPersistent] = useState(true);
  useEffect(() => {
    const storage = browserStorage();
    const savedOk = writeStorage(storage, `eduplan-saved-v1-${owner}`, data.saved);
    const compareOk = writeStorage(storage, `eduplan-compare-v1-${owner}`, data.comparison);
    setPersistent(savedOk && compareOk);
    if (savedOk && owner === 'guest') {
      try { const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)); keys.filter(key => key?.startsWith('eduplan-saved-') && !key.startsWith('eduplan-saved-v1-')).forEach(key => storage.removeItem(key)); } catch { /* retry migration on next visit */ }
    }
  }, [data, owner]);
  function toggleSaved(item) { setData(current => ({ ...current, saved: current.saved.some(value => value.id === item.id) ? current.saved.filter(value => value.id !== item.id) : [...current.saved, item] })); }
  function removeSaved(id) { setData(current => ({ ...current, saved: current.saved.filter(item => item.id !== id) })); }
  function toggleCompare(program) { setData(current => ({ ...current, comparison: current.comparison.some(p => p.id === program.id) ? current.comparison.filter(p => p.id !== program.id) : addComparison(current.comparison, program) })); }
  return <ExplorationContext.Provider value={{ ...data, persistent, toggleSaved, removeSaved, toggleCompare, clearComparison: () => setData(current => ({ ...current, comparison: [] })) }}>{children}</ExplorationContext.Provider>;
}
export function ExplorationProvider({ children }) { const { user } = useAuth(); const owner = user ? `user-${user.id}` : 'guest'; return <OwnerProvider key={owner} owner={owner}>{children}</OwnerProvider>; }
export function useExploration() { return useContext(ExplorationContext); }
