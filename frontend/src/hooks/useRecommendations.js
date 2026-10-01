import { useEffect,useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { sufficientPreferences } from '../utils/preferences';
import { getRecommendations } from '../services/recommendations';
export function useRecommendations({ limit=20,sourceIds,excludedSourceIds=[] }={}) {
  const { user } = useAuth(), profile = useAcademicProfile();
  const [result,setResult] = useState({ data:[],status:'INCOMPLETE_PROFILE' }), [state,setState] = useState('loading'), [error,setError] = useState(''), [retry,setRetry] = useState(0);
  const [activeSignature,setActiveSignature] = useState('');
  const signature = JSON.stringify([user?.id,profile.preferences,profile.interests.areas,profile.interests.motivations,profile.refinement,profile.state,limit,sourceIds,excludedSourceIds]);
  useEffect(()=> {
    const request = new AbortController(); setActiveSignature(signature); setResult({data:[],status:'INCOMPLETE_PROFILE'}); setError('');
    if (profile.state==='loading') { setState('loading'); return ()=>request.abort(); }
    if (profile.state==='error') { setState('error'); setError(profile.error); return ()=>request.abort(); }
    if (!user || !sufficientPreferences(profile.preferences,profile.interests,profile.refinement) || sourceIds?.length===0) { setState('ready'); return ()=>request.abort(); }
    setState('loading');
    getRecommendations(profile,{limit,sourceIds,excludedSourceIds,signal:request.signal}).then(value=> { if (!request.signal.aborted) { setResult(value); setState('ready'); } }).catch(reason=> { if (!request.signal.aborted) { setError(reason.message); setState('error'); } });
    return ()=>request.abort();
  },[signature,retry]);
  // A changed profile/selection must not briefly display the previous profile's scores.
  return { ...(activeSignature === signature ? {...result,state,error} : {data:[],status:'INCOMPLETE_PROFILE',state:'loading',error:''}),retry:()=> { if (profile.state==='error') profile.reload(); else setRetry(v=>v+1); } };
}
