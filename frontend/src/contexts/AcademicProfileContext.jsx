import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getInterests, getPreferences, putPreferences } from '../services/account';
import { emptyPreferences, profileCompleteness } from '../utils/preferences';
const Context = createContext(null);
// Remount on account/token change: never render another account's preferences or requests.
export function AcademicProfileProvider({ children }) {
  const { user, token } = useAuth();
  return <AccountProfile key={`${user?.id || 'guest'}-${token || ''}`} token={token}>{children}</AccountProfile>;
}
function AccountProfile({ token, children }) {
  const [preferences,setPreferences] = useState(emptyPreferences), [interests,setInterests] = useState({ areas: [], motivations: [] });
  const [state,setState] = useState(token ? 'loading' : 'guest'), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  useEffect(() => {
    if (!token) return;
    const request = new AbortController(); setState('loading'); setError('');
    Promise.all([getPreferences(token,request.signal),getInterests(token,request.signal)]).then(([p,i]) => {
      if (!request.signal.aborted) { setPreferences(p); setInterests(i); setState('ready'); }
    }).catch(reason => { if (!request.signal.aborted) { setState('error'); setError(reason.message); } });
    return () => request.abort();
  },[token,revision]);
  useEffect(() => {
    const reload = () => setRevision(v=>v+1);
    window.addEventListener('eduplan-profile-updated',reload);
    return () => window.removeEventListener('eduplan-profile-updated',reload);
  },[]);
  async function savePreferences(value, signal) {
    const result = await putPreferences(value,token,signal);
    if (!signal?.aborted) setPreferences(result);
    return result;
  }
  return <Context.Provider value={{ preferences,interests,state,error,savePreferences,reload:()=>setRevision(v=>v+1), completeness:profileCompleteness(preferences,interests) }}>{children}</Context.Provider>;
}
export const useAcademicProfile = () => useContext(Context);
