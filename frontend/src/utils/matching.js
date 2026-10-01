import config from '../../../data-integration/src/config/matching-v2.json' with {type:'json'};
export {config as matchingConfig};
export const emptyRefinement={specificNbcs:[],activities:[],contexts:[],excludedNbcs:[],locationImportance:'',modalityImportance:'',duration:'',sector:'',exclusionsReviewed:false};
const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function formationOptions(level){return [...new Map(config.formations.filter(f=>f.academicLevel===level&&f.selectable!==false).map(f=>[f.id,{id:f.id,label:f.label}])).values()];}
export function relatedNbcs(areas){return config.nbcs.filter(n=>areas.some(a=>config.interests[a]?.nbcs.some(v=>key(v)===key(n.name))||config.interests[a]?.broadAreas.some(v=>key(v)===key(n.broadArea))));}
export function validRefinement(value){
  if(!value||typeof value!=='object')return false;
  if(value.exclusionsReviewed!==undefined&&typeof value.exclusionsReviewed!=='boolean')return false;
  const lists=[['specificNbcs',config.nbcs.map(n=>n.name),8],['activities',config.activities.map(n=>n.label),8],['contexts',config.contexts.map(n=>n.label),5],['excludedNbcs',config.nbcs.map(n=>n.name),8]];
  if(!lists.every(([field,options,max])=>Array.isArray(value[field])&&value[field].length<=max&&new Set(value[field]).size===value[field].length&&value[field].every(v=>options.includes(v))))return false;
  if(value.specificNbcs.some(n=>value.excludedNbcs.includes(n)))return false;
  return [['locationImportance',config.locationPriorities],['modalityImportance',config.modalityPriorities],['duration',config.durationOptions],['sector',config.sectorOptions]].every(([field,options])=>typeof value[field]==='string'&&(value[field]===''||options.some(v=>v.id===value[field])));
}
export function refinementProgress(value,preferences,motivations=[]){
  const applicableLocation=['CITY','DEPARTMENT'].includes(preferences.mobility),applicableModality=Boolean(preferences.modality);
  const answers=[value.specificNbcs.length>0,value.activities.length>0||motivations.some(m=>config.activities.some(a=>a.label===m)),value.contexts.length>0,Boolean(value.duration),Boolean(value.sector),Boolean(value.exclusionsReviewed||value.excludedNbcs.length)];
  if(applicableLocation)answers.push(Boolean(value.locationImportance));if(applicableModality)answers.push(Boolean(value.modalityImportance));
  return {answered:answers.filter(Boolean).length,total:answers.length};
}
