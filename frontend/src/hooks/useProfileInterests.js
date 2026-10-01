import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { browserStorage, readStorage, writeStorage } from '../utils/storage';
import { validInterests, interestProgress } from '../utils/interests';
import { getInterests, putInterests } from '../services/account';
export { areas, motivations } from '../utils/interests';
const empty = { areas: [], motivations: [] };
export function useProfileInterests() {
  const { user, token } = useAuth();
  const owner = user ? `user-${user.id}` : 'guest', key = `eduplan-interests-v1-${owner}`;
  const pendingKey = `eduplan-interests-pending-v1-${owner}`, migratedKey = `eduplan-interests-migrated-v1-${owner}`;
  const [selections, setSelections] = useState(() => readStorage(browserStorage(), key, empty, validInterests));
  const [message, setMessage] = useState(''), [syncState, setSyncState] = useState(token ? 'loading' : 'local');
  const [updatedAt, setUpdatedAt] = useState(null), [retry, setRetry] = useState(0);
  const controller = useRef(null), selectionsRef = useRef(selections), pendingMemory = useRef(null);
  function select(value) { selectionsRef.current = value; setSelections(value); }
  function cache(value) { return writeStorage(browserStorage(), key, { areas: value.areas, motivations: value.motivations }); }
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    const local = pendingMemory.current?.owner === owner ? pendingMemory.current.value : readStorage(browserStorage(), key, empty, validInterests);
    select(local); setMessage(''); setUpdatedAt(null);
    if (!token) { setSyncState('local'); return () => request.abort(); }
    setSyncState('loading');
    (async () => {
      try {
        const remote = await getInterests(token, request.signal);
        if (request.signal.aborted) return;
        const pending = pendingMemory.current?.owner === owner ? pendingMemory.current.value : readStorage(browserStorage(), pendingKey, null, validInterests);
        const old = !remote.updatedAt && !readStorage(browserStorage(), migratedKey, false, v => typeof v === 'boolean') && (local.areas.length || local.motivations.length) ? local : null;
        const value = pending || old;
        const result = value ? await putInterests(value, token, request.signal) : remote;
        if (request.signal.aborted) return;
        select(result); cache(result); setUpdatedAt(result.updatedAt); setSyncState('synced');
        if (value) window.dispatchEvent(new Event('eduplan-profile-updated'));
        pendingMemory.current = null;
        writeStorage(browserStorage(), migratedKey, true);
        try { browserStorage()?.removeItem(pendingKey); } catch { /* cache unavailable */ }
      } catch (error) { if (!request.signal.aborted) { setSyncState('error'); setMessage(error.message); } }
    })();
    return () => request.abort();
  }, [key, token, retry]);
  function toggle(group, value) {
    if (syncState === 'loading' || syncState === 'saving') return;
    const current = selectionsRef.current;
    select({ ...current, [group]: current[group].includes(value) ? current[group].filter(v => v !== value) : [...current[group], value] });
    if (pendingMemory.current?.owner === owner) pendingMemory.current.value = selectionsRef.current;
    setMessage('Cambios sin guardar.');
  }
  async function save() {
    const value = selectionsRef.current;
    if (!token) { setMessage(cache(value) ? 'Intereses guardados en este dispositivo.' : 'Los cambios permanecen durante esta visita.'); return; }
    if (syncState === 'loading' || syncState === 'saving') return;
    pendingMemory.current = { owner, value };
    const persisted = cache(value) && writeStorage(browserStorage(), pendingKey, { areas: value.areas, motivations: value.motivations });
    const request = controller.current;
    setSyncState('saving'); setMessage('Guardando intereses…');
    try {
      const result = await putInterests(value, token, request.signal);
      if (request.signal.aborted) return;
      setUpdatedAt(result.updatedAt); setSyncState('synced'); setMessage('Intereses guardados en tu cuenta.');
      window.dispatchEvent(new Event('eduplan-profile-updated'));
      pendingMemory.current = null;
      writeStorage(browserStorage(), migratedKey, true);
      try { browserStorage()?.removeItem(pendingKey); } catch { /* unavailable storage */ }
      return true;
    } catch (error) { if (!request.signal.aborted) { setSyncState('error'); setMessage(persisted ? `${error.message} Reintenta para guardar tus intereses.` : 'No pudimos guardar en tu cuenta ni en este dispositivo. Tus cambios permanecen durante esta visita.'); } return false; }
  }
  return { selections, toggle, save, message, updatedAt, syncState, retrySync: () => setRetry(v => v + 1), progress: interestProgress(selections) };
}
