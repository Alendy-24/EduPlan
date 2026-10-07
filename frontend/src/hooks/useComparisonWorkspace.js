import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { browserStorage, readStorage, writeStorage } from '../utils/storage';
import { validComparisonWorkspace } from '../utils/comparison';

const empty = () => ({ priorities:[], notes:{}, favorite:null });
export function useComparisonWorkspace() {
  const { user } = useAuth();
  const owner = user?.id ?? 'guest';
  const storageKey = 'eduplan-comparison-workspace-v1-' + owner;
  const [states,setStates] = useState({});
  const stored = states[owner] ?? { data:readStorage(browserStorage(),storageKey,empty(),validComparisonWorkspace), persistent:true };
  function update(change) {
    const data = change(stored.data);
    const persistent = writeStorage(browserStorage(),storageKey,data);
    setStates(current=>({...current,[owner]:{data,persistent}}));
  }
  return { ...stored.data, persistent:stored.persistent,
    toggleFavorite:id=>update(data=>({...data,favorite:data.favorite === id ? null : id})),
    clearFavorite:()=>update(data=>({...data,favorite:null})),
    togglePriority:key=>update(data=>({...data,priorities:data.priorities.includes(key) ? data.priorities.filter(value=>value!==key) : [...data.priorities,key]})),
    setNote:(key,text,alias)=>update(data=>({...data,notes:{...data.notes,[key]:text,...(alias && alias !== key ? {[alias]:text} : {})}})),
  };
}
