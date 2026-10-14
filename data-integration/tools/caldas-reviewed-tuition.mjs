import {municipalityKey} from '../dist/utils/municipality-key.js';
export const CALDAS_SOURCE='https://artesyhumanidades.ucaldas.edu.co/wp-content/uploads/Acuerdo-05_-29-de-enero_matricula-inscripcion-y-otros-factores-relacionados-con-los-programas-de-posgrado-1-1.pdf';
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function extractReviewedCaldasTuition(review,hash,names,checkedAt){
 const year=Number(checkedAt.slice(0,4));
 if(review.schemaVersion!==1||review.institutionCode!=='1112'||review.source!==CALDAS_SOURCE||review.reviewMethod!=='VISUAL_OFFICIAL_PDF'||review.priceYear!==year||!/^[a-f0-9]{64}$/.test(review.contentSha256)||hash!==review.contentSha256)throw new Error('La tabla Caldas requiere nueva revisión visual');
 const records=[],outcomes=[];
 for(const row of review.rows){
  if(!Number.isSafeInteger(row.amount)||row.amount<=0||row.sourcePage!==3||!row.municipality?.trim()||!row.name?.trim())throw new Error('Fila Caldas sin contexto verificado');
  if(['DOCTORADOENESTUDIOSTERRITORIALES','DOCTORADOENCIENCIAS','DOCTORADOENCIENCIASBIOMEDICAS','MAESTRIAENEPIDEMIOLOGIA'].includes(fold(row.name))){outcomes.push({program:row.name,reason:'CONFLICT_CONVENTION_OR_NO_NEW_COHORT'});continue;}
  const matches=names.filter(n=>n[1]==='1112'&&n[4]==='Posgrado'&&fold(n[2])===fold(row.name)&&municipalityKey(n[6])===municipalityKey(row.municipality));
  const unique=[...new Map(matches.map(n=>[JSON.stringify([n[0],n[1],fold(n[5]),municipalityKey(n[6])]),n])).values()];
  const sharedScope=review.scope==='ALL_ACTIVE_AND_NEW_COHORTS'&&review.scopeSourcePage===2;
  if(!unique.length||unique.length>1&&(!sharedScope||new Set(unique.map(n=>fold(n[5]))).size!==1)){
   outcomes.push({program:row.name,city:row.municipality,reason:'AMBIGUOUS_OR_MISSING_ACTIVE_IDENTITY'});continue;
  }
  // Article 1 explicitly includes both active and new cohorts. When the exact
  // name, city and modality coincide, its single rate covers each active code;
  // no code is selected on behalf of the source catalog.
  for(const n of unique)records.push({sniesCode:n[0],institutionCode:n[1],programName:n[2],modality:n[5],municipality:n[6],amount:row.amount,source:review.source,sourcePage:3,checkedAt,priceYear:year,billingPeriod:'ACADEMIC_PERIOD',
   note:`Acuerdo 05/2026, importe literal de la columna «Valor matrícula 2026», tabla revisada visualmente. ${row.annual?'Tarifa anualizada de Epidemiología.':'La tabla no especifica la duración del período cobrado para esta fila.'} No se calculó desde salarios mínimos ni porcentajes. Inscripción, beneficios y otros derechos requieren liquidación específica.`,contentSha256:hash,reviewMethod:review.reviewMethod,collector:'CALDAS_REVIEWED_PDF_V1'});
 }
 return {records,outcomes};
}
