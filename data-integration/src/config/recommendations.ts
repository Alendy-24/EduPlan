import data from './matching-v2.json' with { type: 'json' };
export const RECOMMENDATION_CONFIG = data;
export const normalizeAcademicText = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const canonical = (values: string[], value: string) => values.find(v=>normalizeAcademicText(v)===normalizeAcademicText(value));
const nbcNames=new Map(data.nbcs.map(n=>[normalizeAcademicText(n.name),n.name]));
const interestNames=new Map(Object.keys(data.interests).map(n=>[normalizeAcademicText(n),n]));
const formations=new Map(data.formations.map(f=>[normalizeAcademicText(f.academicLevel)+'|'+normalizeAcademicText(f.raw),f]));
export const canonicalNbc=(value:string)=>nbcNames.get(normalizeAcademicText(value));
export const canonicalInterest=(value:string)=>interestNames.get(normalizeAcademicText(value));
export const formationFor=(academicLevel:string,raw:string)=>formations.get(normalizeAcademicText(academicLevel)+'|'+normalizeAcademicText(raw));
export function durationMonths(periodCount: string, periodicity: string) {
  const count=Number(periodCount),unit=Object.entries(data.periodMonths).find(([name])=>normalizeAcademicText(name)===normalizeAcademicText(periodicity))?.[1];
  if(!Number.isInteger(count)||count<=0||!unit||count*unit>Math.max(...data.durationOptions.map(d=>d.maxMonths)))return null;
  return count*unit;
}
export interface Refinement { specificNbcs: string[]; activities: string[]; contexts: string[]; excludedNbcs: string[]; locationImportance: string; modalityImportance: string; duration: string; sector: string; exclusionsReviewed?: boolean }
export const emptyRefinement: Refinement = {specificNbcs:[],activities:[],contexts:[],excludedNbcs:[],locationImportance:'',modalityImportance:'',duration:'',sector:'',exclusionsReviewed:false};
export function validRefinement(value: unknown): value is Refinement {
  if(!value||typeof value!=='object')return false;
  const r=value as Refinement;
  if(r.exclusionsReviewed !== undefined && typeof r.exclusionsReviewed !== 'boolean')return false;
  const lists: [keyof Refinement,string[],number][]=[['specificNbcs',data.nbcs.map(n=>n.name),8],['excludedNbcs',data.nbcs.map(n=>n.name),8],['activities',data.activities.map(a=>a.label),8],['contexts',data.contexts.map(a=>a.label),5]];
  if(!lists.every(([key,allowed,max])=>Array.isArray(r[key])&&(r[key] as string[]).length<=max&&(r[key] as string[]).every(v=>typeof v==='string'&&Boolean(canonical(allowed,v)))&&new Set((r[key] as string[]).map(normalizeAcademicText)).size===(r[key] as string[]).length))return false;
  if(r.specificNbcs.some(n=>r.excludedNbcs.some(e=>normalizeAcademicText(e)===normalizeAcademicText(n))))return false;
  return [['locationImportance',data.locationPriorities],['modalityImportance',data.modalityPriorities],['duration',data.durationOptions],['sector',data.sectorOptions]].every(([key,options])=>typeof r[key as keyof Refinement]==='string'&&(r[key as keyof Refinement]===''||(options as {id:string}[]).some(o=>o.id===r[key as keyof Refinement])));
}
