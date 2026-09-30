import { createContext, useContext, useEffect, useState } from 'react';
import { browserStorage, readStorage, writeStorage } from '../utils/storage';
const AuthContext = createContext(null);
const key = 'eduplan-session-v1';
function validSession(value) { return value && typeof value.token === 'string' && value.token && Number.isInteger(value.user?.id) && typeof value.user?.name === 'string' && typeof value.user?.email === 'string' && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now(); }
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStorage(browserStorage('sessionStorage'), key, null, validSession));
  const [persistent, setPersistent] = useState(true);
  function logout() { setSession(null); try { browserStorage('sessionStorage')?.removeItem(key); } catch { /* session remains cleared in memory */ } }
  function startSession(value) { setPersistent(writeStorage(browserStorage('sessionStorage'), key, value)); setSession(value); }
  useEffect(() => {
    window.addEventListener('eduplan-auth-rejected', logout);
    return () => window.removeEventListener('eduplan-auth-rejected', logout);
  }, []);
  useEffect(() => {
    if (!session) return;
    const check = () => { if (session.expiresAt <= Date.now()) logout(); };
    const timer = setTimeout(check, Math.min(session.expiresAt - Date.now(), 2147483647));
    window.addEventListener('focus', check);
    return () => { clearTimeout(timer); window.removeEventListener('focus', check); };
  }, [session]);
  return <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, startSession, logout, persistent }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
