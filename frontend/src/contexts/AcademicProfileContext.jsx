import {emptyRefinement} from '../utils/matching';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getInterests, getPreferences, putPreferences,getMatchingPreferences,putMatchingPreferences,getFinancingPreferences,putFinancingPreferences } from '../services/account';
import { emptyFinancingPreferences } from '../utils/financing';
import { emptyPreferences, profileCompleteness } from '../utils/preferences';
const Context = createContext(null);
// Remount on account/token change: never render another account's preferences or requests.
export function AcademicProfileProvider({ children }) {
  const { user, token } = useAuth();
  return <AccountProfile key={`${user?.id || 'guest'}-${token || ''}`} token={token}>{children}</AccountProfile>;
}
function AccountProfile({ token, children }) {
  const [preferences,setPreferences] = useState(emptyPreferences), [interests,setInterests] = useState({ areas: [], motivations: [] });
  const [refinement,setRefinement]=useState(emptyRefinement);
  const [financing,setFinancing] = useState(emptyFinancingPreferences);
  const [financingState,setFinancingState] = useState(token ? 'loading' : 'guest'), [financingError,setFinancingError] = useState(''), [financingRevision,setFinancingRevision] = useState(0);
  const [state,setState] = useState(token ? 'loading' : 'guest'), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  useEffect(() => {
    if (!token) return;
    const request = new AbortController(); setState('loading'); setError('');
    Promise.all([getPreferences(token,request.signal),getInterests(token,request.signal),getMatchingPreferences(token,request.signal)]).then(([p,i,r]) => {
      if (!request.signal.aborted) { setPreferences(p); setInterests(i); setRefinement(r); setState('ready'); }
    }).catch(reason => { if (!request.signal.aborted) { setState('error'); setError(reason.message); } });
    return () => request.abort();
  },[token,revision]);
  useEffect(() => {
    if (!token) return;
    const request = new AbortController(); setFinancingState('loading'); setFinancingError('');
    getFinancingPreferences(token, request.signal).then(value => {
      if (!request.signal.aborted) { setFinancing(value); setFinancingState('ready'); }
    }).catch(reason => {
      if (!request.signal.aborted) { setFinancing(emptyFinancingPreferences); setFinancingError(reason.message); setFinancingState('error'); }
    });
    return () => request.abort();
  }, [token,financingRevision]);
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
  async function saveRefinement(value,signal) { const result=await putMatchingPreferences(value,token,signal);if(!signal?.aborted)setRefinement(result);return result; }
  async function saveFinancing(value, signal) {
    const result = await putFinancingPreferences(value, token, signal);
    if (!signal?.aborted) { setFinancing(result); setFinancingState('ready'); setFinancingError(''); }
    return result;
  }
  return <Context.Provider value={{ preferences,interests,refinement,financing,financingState,financingError,state,error,savePreferences,saveRefinement,saveFinancing,reloadFinancing:()=>setFinancingRevision(v=>v+1),reload:()=>setRevision(v=>v+1), completeness:profileCompleteness(preferences,interests) }}>{children}</Context.Provider>;
}
export const useAcademicProfile = () => useContext(Context);
