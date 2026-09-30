import { useEffect, useRef, useState } from 'react';
import { getProgramLinks } from '../services/program-links';
import { withOfficialProgram } from '../utils/programs';

// Catalog results remain usable while the independent official metadata loads.
export function useOfficialPrograms(programs) {
  const cache = useRef(new Map());
  const [links,setLinks] = useState(new Map());
  const key = JSON.stringify(programs.filter(program=>program.provenance === 'real' && program.sourceId).map(program=>program.sourceId));
  useEffect(() => {
    const ids = JSON.parse(key).filter(id=>!cache.current.has(id));
    if (!ids.length) return;
    const controller = new AbortController();
    (async () => {
      for (let offset=0;offset<ids.length;offset+=100) {
        const values = await getProgramLinks(ids.slice(offset,offset+100),controller.signal);
        if (controller.signal.aborted) return;
        values.forEach(link=>cache.current.set(link.sourceId,link));
        setLinks(new Map(cache.current));
      }
    })().catch(()=>{}); // Official API outages never remove public catalog results.
    return () => controller.abort();
  },[key]);
  return programs.map(program=>withOfficialProgram(program,links.get(program.sourceId)));
}
