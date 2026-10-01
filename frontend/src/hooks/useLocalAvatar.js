import { useSyncExternalStore } from 'react';
import { browserStorage } from '../utils/storage';
import { readAvatar, persistAvatar } from '../utils/avatar';
const event = 'eduplan-local-avatar-changed';
function subscribe(callback) {
  window.addEventListener(event, callback); window.addEventListener('storage', callback);
  return () => { window.removeEventListener(event, callback); window.removeEventListener('storage', callback); };
}
// Isolated device-only storage; never included in auth/profile API payloads.
export function useLocalAvatar(user) {
  const photo = useSyncExternalStore(subscribe, () => readAvatar(browserStorage(), user?.id), () => '');
  function setPhoto(value) { persistAvatar(browserStorage(), user?.id, value); window.dispatchEvent(new Event(event)); }
  return { photo, setPhoto };
}
