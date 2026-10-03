import { useEffect, useState } from 'react';
import { getProgramsByCode } from '../services/programs';

// Read current records without replacing a missing selection with another campus
// or another program sharing the source's opaque code. Saved selections stay intact.
export function useComparisonPrograms(selection) {
  const signature = JSON.stringify(selection.map(program=>[program.id,program.code,program.provenance]));
  const [result,setResult] = useState({signature:'',data:{},loading:false});
  const [retry,setRetry] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    const entries = JSON.parse(signature).filter(([,code,provenance])=>code && provenance === 'real');
    setResult({signature,data:{},loading:entries.length > 0});
    const codes = [...new Set(entries.map(([,code])=>code))];
    Promise.allSettled(codes.map(code=>getProgramsByCode(code,controller.signal))).then(responses=>{
      if (controller.signal.aborted) return;
      const data = {};
      for (const [id,code] of entries) {
        const response = responses[codes.indexOf(code)];
        if (response.status === 'rejected') data[id] = {state:'error'};
        else {
          const program = response.value.programs.find(program=>program.sourceId === id);
          data[id] = program ? {state:'current',program} : {state:'missing'};
        }
      }
      setResult({signature,data,loading:false});
    });
    return ()=>controller.abort();
  },[signature,retry]);
  const current = result.signature === signature ? result : {data:{},loading:selection.some(program=>program.provenance==='real' && program.code)};
  return {
    programs:selection.map(program=>({...program,...current.data[program.id]?.program,
      comparisonState:program.provenance === 'demo' ? 'demo' : current.loading ? 'loading' : current.data[program.id]?.state || 'saved'})),
    loading:current.loading, refresh:()=>setRetry(value=>value+1),
  };
}
