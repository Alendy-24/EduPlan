import type { Program } from '../models/program.js';
import { RECOMMENDATION_CONFIG as config, normalizeAcademicText,canonicalInterest,canonicalNbc,formationFor,durationMonths,emptyRefinement,type Refinement } from '../config/recommendations.js';
export { normalizeAcademicText } from '../config/recommendations.js';
export interface Preferences { academicLevel: string; educationLevel?: string; modality: string; municipality: string; department: string; mobility: string }
export interface RecommendationProfile { preferences: Preferences; areas: string[]; motivations?: string[]; refinement?: Refinement }
const usable=(value?:string)=>Boolean(value?.trim()&&!['na','n a','sin clasificar','no disponible'].includes(normalizeAcademicText(value)));
const locationKey=(value:string)=>normalizeAcademicText(value).replace(/^bogota(?: d c)?$/,'bogota');
const interestMap=config.interests as Record<string,{nbcs:string[];broadAreas:string[]}>;
const same=(a:string,b:string)=>normalizeAcademicText(a)===normalizeAcademicText(b);
const rFor=(profile:RecommendationProfile)=>profile.refinement||emptyRefinement;
export function matchingInterests(program:Program,areas:string[]) {
  return [...new Set(areas.map(canonicalInterest).filter((a):a is string=>Boolean(a)))].filter(a=>interestMap[a].nbcs.some(n=>same(n,program.knowledgeArea)));
}
export function isProgramEligibleForRecommendation(program:Program) {
  return normalizeAcademicText(program.status||'')==='activo'&&/^\d+$/.test(program.institutionCode)&&usable(program.institutionName)&&usable(program.name)&&program.nameOrigin==='SNIES_NAME'&&!program.reviewRequired&&usable(program.academicLevel)&&usable(program.knowledgeArea)&&Boolean(program.code?.trim())&&/^upr9-nkiz:[\w.~-]+$/.test(program.sourceId);
}
export function hasSufficientProfile(profile:RecommendationProfile) {
  return (profile.areas.some(a=>canonicalInterest(a))||rFor(profile).specificNbcs.some(n=>canonicalNbc(n)))&&!(profile.preferences.mobility==='CITY'&&!profile.preferences.municipality.trim())&&!(profile.preferences.mobility==='DEPARTMENT'&&!profile.preferences.department.trim());
}
export function satisfiesRestrictions(program:Program,profile:RecommendationProfile) {
  const p=profile.preferences,r=rFor(profile),locationRequired=(r.locationImportance||'REQUIRED')==='REQUIRED';
  return isProgramEligibleForRecommendation(program)&&(!p.academicLevel||same(program.academicLevel,p.academicLevel))
    &&(!p.educationLevel||formationFor(program.academicLevel,program.educationLevel)?.id===p.educationLevel)
    &&(!locationRequired||p.mobility!=='CITY'||locationKey(program.municipality)===locationKey(p.municipality))
    &&(!locationRequired||p.mobility!=='DEPARTMENT'||locationKey(program.department)===locationKey(p.department))
    &&(r.modalityImportance!=='REQUIRED'||!p.modality||same(program.modality,p.modality))
    &&!r.excludedNbcs.some(n=>same(n,program.knowledgeArea));
}
export function academicAffinity(program:Program,profile:RecommendationProfile) {
  const r=rFor(profile),nbc=canonicalNbc(program.knowledgeArea),specific=r.specificNbcs.map(canonicalNbc).filter((n):n is string=>Boolean(n));
  if(specific.length) {
    const exact=specific.find(n=>n===nbc);if(exact)return {match:1,detail:`Su NBC es ${exact}, uno de tus intereses específicos.`};
    const relations=config.relationships.filter(pair=>specific.some(n=>(n===pair.a&&nbc===pair.b)||(n===pair.b&&nbc===pair.a))).sort((a,b)=>b.strength-a.strength);
    if(relations.length)return {match:relations[0].strength,detail:`Su NBC (${program.knowledgeArea}) tiene una relación temática de ${relations[0].reason} con tu selección específica.`};
    const broadAreas=specific.map(n=>config.nbcs.find(v=>v.name===n)?.broadArea);
    if(usable(program.broadKnowledgeArea)&&broadAreas.some(a=>a&&same(a,program.broadKnowledgeArea!)))return {match:config.strengths.specificBroad,detail:`Comparte el área amplia ${program.broadKnowledgeArea} con tu selección; su NBC es distinto.`};
    return {match:0,detail:'Su NBC no está relacionado con tus intereses específicos en la configuración actual.'};
  }
  const general=matchingInterests(program,profile.areas);
  if(general.length)return {match:config.strengths.generalNbc,detail:`Su NBC (${program.knowledgeArea}) pertenece a ${general.join(' y ')}. Aún no elegiste un NBC específico.`};
  const broad=profile.areas.map(canonicalInterest).filter((a):a is string=>Boolean(a)).find(a=>interestMap[a].broadAreas.some(b=>same(b,program.broadKnowledgeArea||'')));
  return broad?{match:config.strengths.generalBroad,detail:`Comparte el área amplia de ${broad}; no coincide con uno de sus NBC relacionados.`}:{match:0,detail:'Sin relación académica identificada con tus intereses.'};
}
function cueAffinity(program:Program,labels:string[],cues:typeof config.activities) {
  const selected=[...new Set(labels.map(normalizeAcademicText))].map(label=>cues.find(c=>same(c.label,label))).filter((c):c is typeof config.activities[number]=>Boolean(c));
  if(!selected.length)return null;
  const matches=selected.map(c=>({label:c.label,strength:c.relations.find(n=>same(n.nbc,program.knowledgeArea))?.strength||0}));
  return {match:matches.reduce((s,c)=>s+c.strength,0)/matches.length,labels:matches.filter(c=>c.strength>0).map(c=>c.label),count:matches.length};
}
export function scoreProgram(program:Program,profile:RecommendationProfile) {
  if(!hasSufficientProfile(profile)||!satisfiesRestrictions(program,profile))return null;
  const p=profile.preferences,r=rFor(profile),affinity=academicAffinity(program,profile);
  const activity=cueAffinity(program,[...r.activities,...(profile.motivations||[])],config.activities),context=cueAffinity(program,r.contexts,config.contexts);
  const cues=activity&&context?{match:activity.match*config.strengths.activityShare+context.match*(1-config.strengths.activityShare),labels:[...activity.labels,...context.labels]}:activity||context;
  const activeLocation=['CITY','DEPARTMENT'].includes(p.mobility)&&(r.locationImportance||'REQUIRED')!=='IGNORE';
  const activeModality=Boolean(p.modality)&&r.modalityImportance!=='IGNORE';
  const months=durationMonths(program.periodCount,program.periodicity),duration=config.durationOptions.find(d=>d.id===r.duration);
  const actualDuration=months===null?null:config.durationOptions.find(d=>months<=d.maxMonths)?.id;
  const sector=config.sectorOptions.find(s=>s.raw.some(raw=>same(raw,program.institutionSector||'')));
  type Criterion=keyof typeof config.weights;
  const breakdown:{criterion:Criterion;weight:number;match:number|null;state:string;detail:string}[]=[];
  const add=(criterion:Criterion,active:boolean,match:number|null,detail:string)=>breakdown.push({criterion,weight:config.weights[criterion],match:active?match:null,state:!active?'NOT_ANSWERED':match===null?'MISSING':match===1?'MATCH':match>0?'PARTIAL':'NO_MATCH',detail});
  add('affinity',true,affinity.match,affinity.detail);
  add('activities',Boolean(cues),cues?.match??null,cues?.labels.length?`Relación editorial de su NBC con ${cues.labels.join(', ')}; se consideran todas tus actividades y motivaciones elegidas.`:'Su NBC no tiene una relación configurada con las actividades o contextos que elegiste.');
  const modality= same(program.modality||'',p.modality)?1:[program.modality,p.modality].some(v=>same(v||'','Presencial-Virtual'))&&['Presencial','Virtual','Presencial-Virtual'].includes(program.modality)&&['Presencial','Virtual','Presencial-Virtual'].includes(p.modality)?config.strengths.hybridModality:0;
  add('modality',activeModality,usable(program.modality)?modality:null,modality===1?`Se ofrece en ${program.modality}, tu modalidad elegida.`:modality>0?'La modalidad híbrida comparte parte del formato que prefieres.':`La modalidad publicada (${program.modality||'no disponible'}) difiere de tu preferencia.`);
  const city=locationKey(program.municipality)===locationKey(p.municipality),department=locationKey(program.department)===locationKey(p.department);
  const location=city||p.mobility==='DEPARTMENT'&&department?1:department?config.strengths.sameDepartment:config.strengths.otherLocation;
  add('location',activeLocation,usable(program.municipality)&&usable(program.department)?location:null,location===1?`Se ofrece en ${p.mobility==='CITY'?program.municipality:program.department}, tu ubicación elegida.`:department?'Se ofrece en otra ciudad del mismo departamento.':`Se ofrece en ${program.municipality||'una ciudad no publicada'}, fuera de tu ubicación preferida pero aceptada.`);
  if(activeLocation&&r.locationImportance==='PREFERRED')breakdown[breakdown.length-1].weight*=config.strengths.preferredLocationMultiplier;
  add('formation',Boolean(p.educationLevel),formationFor(program.academicLevel,program.educationLevel)?1:null,`Tipo de formación publicado: ${program.educationLevel||'no disponible'}.`);
  let durationMatch:number|null=months===null?null:actualDuration===r.duration?1:0;
  if(months!==null&&duration&&durationMatch===0){const index=config.durationOptions.findIndex(d=>d.id===r.duration),lower=index>0?config.durationOptions[index-1].maxMonths:0;const boundary=months<=lower?lower+1:duration.maxMonths;durationMatch=Math.max(0,1-Math.abs(months-boundary)/config.strengths.durationToleranceMonths);}
  add('duration',Boolean(duration),durationMatch,months===null?'La periodicidad o cantidad de periodos no permite convertir la duración de forma fiable.':`Duración publicada normalizada: ${months} meses (${program.periodCount} periodos ${program.periodicity.toLowerCase()}).`);
  add('sector',Boolean(r.sector),sector?(sector.id===r.sector?1:0):null,sector?`La institución pertenece al sector ${sector.label.toLowerCase()}.`:'Sector institucional no disponible; no se infiere del nombre.');
  const answered=breakdown.filter(c=>c.state!=='NOT_ANSWERED'),known=answered.filter(c=>c.match!==null);
  const activeWeight=answered.reduce((s,c)=>s+c.weight,0),knownWeight=known.reduce((s,c)=>s+c.weight,0),earned=known.reduce((s,c)=>s+c.weight*c.match!,0);
  const sufficient=r.specificNbcs.length>0&&Boolean(cues)&&known.length>=config.evidence.minimumCriteria&&knownWeight>=config.evidence.minimumActiveWeight;
  const reasons=known.filter(c=>c.match!>0).map(c=>c.detail);if(p.academicLevel)reasons.push(`Coincide con el nivel académico ${program.academicLevel}.`);
  const missingInformation=answered.filter(c=>c.state==='MISSING').map(c=>c.detail);
  if(!program.sniesCode)missingInformation.push('Código SNIES no resuelto de forma única');
  // Display whole earned points without rounding a partial match up to 100.
  // The ranking retains the unrounded sum; all seven full matches can earn 100.
  return {program,score:Math.floor(earned+Number.EPSILON*100),rankingValue:earned,reasons,matchedCriteria:known.filter(c=>c.match!>0).map(c=>c.criterion),unmatchedCriteria:known.filter(c=>c.match===0).map(c=>c.criterion),missingInformation,breakdown,
    evidence:{level:sufficient?'SUFFICIENT':'PRELIMINARY',activeWeight,knownWeight,criteriaAnswered:answered.length,exactMatches:known.filter(c=>c.match===1).length,reason:sufficient?'NBC específico, preferencias de actividad y al menos cuatro criterios con suficiente cobertura.':'Elige un NBC específico y añade actividades y preferencias de estudio para afinar la coincidencia.'},
    provenance:{dataset:'upr9-nkiz',nameSource:program.nameSource,nameImportedAt:program.nameImportedAt,algorithmVersion:config.version}};
}
export function recommendPrograms(programs:Program[],profile:RecommendationProfile,limit=20,excluded:string[]=[]) {
  if(!hasSufficientProfile(profile))return {data:[],status:'INCOMPLETE_PROFILE',eligibleCount:0,algorithmVersion:config.version};
  const ignored=new Set(excluded),seen=new Set<string>();
  const data=programs.flatMap(program=>{if(seen.has(program.sourceId)||ignored.has(program.sourceId))return [];seen.add(program.sourceId);const result=scoreProgram(program,profile);return result?[result]:[];})
    .sort((a,b)=>b.rankingValue-a.rankingValue||(b.breakdown[0].match||0)-(a.breakdown[0].match||0)||a.missingInformation.length-b.missingInformation.length||a.program.name.localeCompare(b.program.name,'es')||a.program.sourceId.localeCompare(b.program.sourceId,'en'));
  return {data:data.slice(0,Math.max(1,Math.min(config.maxResults,limit))),status:data.length?'OK':'NO_RESULTS',eligibleCount:data.length,algorithmVersion:config.version};
}
export function catalogQuality(programs: Program[]) {
  const count = (test: (p: Program) => boolean) => { const n = programs.filter(test).length; return { count: n, percent: programs.length ? Math.round(n / programs.length * 10000) / 100 : 0 }; };
  return { total: programs.length, resolvedNames: count(p => p.nameOrigin === 'SNIES_NAME' && !p.reviewRequired), reviewRequired: count(p => p.reviewRequired),
    active: count(p => normalizeAcademicText(p.status) === 'activo'), inactive: count(p => normalizeAcademicText(p.status) === 'inactivo'),
    unavailableNames: count(p => p.nameOrigin === 'UNAVAILABLE'), nbc: count(p => usable(p.knowledgeArea)), level: count(p => usable(p.academicLevel)),
    modality: count(p => usable(p.modality)), location: count(p => usable(p.municipality)), sniesCode: count(p => usable(p.sniesCode)),
    duplicateSourceIds: programs.length - new Set(programs.map(p => p.sourceId)).size,
    duplicateContexts: programs.length - new Set(programs.map(p => JSON.stringify([p.institutionCode,p.name,p.awardedTitle,p.academicLevel,p.modality,p.municipality,p.status]))).size,
    eligible: count(isProgramEligibleForRecommendation) };
}
