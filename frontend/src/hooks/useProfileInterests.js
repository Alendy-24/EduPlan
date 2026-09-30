import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { browserStorage, readStorage, writeStorage } from '../utils/storage';
import { validInterests, interestProgress } from '../utils/interests';
export { areas, motivations } from '../utils/interests';
const empty = { areas: [], motivations: [] };
export function useProfileInterests() {
  const { user } = useAuth();
  const key = `eduplan-interests-v1-${user ? `user-${user.id}` : 'guest'}`;
  const load = () => readStorage(browserStorage(), key, empty, validInterests);
  const [selections, setSelections] = useState(load);
  const [message, setMessage] = useState('');
  useEffect(() => { setSelections(load()); setMessage(''); }, [key]);
  function toggle(group, value) { setSelections(current => ({ ...current, [group]: current[group].includes(value) ? current[group].filter(v => v !== value) : [...current[group], value] })); setMessage('Cambios sin guardar.'); }
  function save() { setMessage(writeStorage(browserStorage(), key, selections) ? 'Intereses guardados en este dispositivo.' : 'No pudimos guardar en este dispositivo. Tus cambios permanecen durante esta visita.'); }
  const progress = interestProgress(selections);
  return { selections, toggle, save, message, progress };
}
