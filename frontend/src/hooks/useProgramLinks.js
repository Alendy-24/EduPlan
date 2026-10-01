import { useEffect,useState } from 'react';
import { getProgramLinks } from '../services/program-links';
export function useProgramLinks(sourceIds) {
  const signature = JSON.stringify([...new Set(sourceIds.filter(Boolean))]);
  const [result,setResult] = useState({ signature:'',data:[],loading:true,error:'' }), [retry,setRetry] = useState(0);
  useEffect(()=> {
    const ids = JSON.parse(signature), request = new AbortController();
    setResult({signature,data:[],loading:ids.length>0,error:''});
    if (ids.length) getProgramLinks(ids,request.signal).then(data=> { if (!request.signal.aborted) setResult({signature,data,loading:false,error:''}); }).catch(reason=> { if (!request.signal.aborted) setResult({signature,data:[],loading:false,error:reason.message}); });
    return ()=>request.abort();
  },[signature,retry]);
  const current = result.signature===signature ? result : {data:[],loading:JSON.parse(signature).length>0,error:''};
  return {...current,retry:()=>setRetry(v=>v+1)};
}
