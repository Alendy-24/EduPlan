import {municipalityKey} from '../dist/utils/municipality-key.js';
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function extractReviewedTadeoTuition(review,hashes,names,checkedAt){
 const year=Number(checkedAt.slice(0,4));
 if(review.schemaVersion!==1||review.institutionCode!=='1707'||review.reviewMethod!=='VISUAL_OFFICIAL_PDF'||review.priceYear!==year)throw new Error('La revisión Tadeo no confirma la vigencia actual');
 for(const [id,file] of Object.entries(review.documents))if(!/^https:\/\/www\.utadeo\.edu\.co\/sites\/tadeo\/files\/node\/wysiwyg\/202(?:5014|6002)\.pdf$/.test(file.source)||!/^[a-f0-9]{64}$/.test(file.sha256)||hashes[id]!==file.sha256)throw new Error('El documento Tadeo cambió: requiere nueva revisión visual');
 if(Object.keys(review.documents).sort().join(',')!=='addendum,base')throw new Error('Falta una fuente revisada Tadeo');
 const records=[],outcomes=[];
 for(const row of review.rows){
  const doc=review.documents[row.document];
  if(!doc||!Number.isSafeInteger(row.amount)||row.amount<=0||!Number.isInteger(row.sourcePage)||row.sourcePage<1||row.sourcePage>(row.document==='base'?11:2)||!['Pregrado','Posgrado'].includes(row.academicLevel))throw new Error('Fila revisada Tadeo incompleta');
  if(row.academicLevel==='Pregrado'&&review.excludedForShift.some(n=>fold(n)===fold(row.name))){outcomes.push({program:row.name,reason:'VARIABLE_BY_SHIFT'});continue;}
  const matches=names.filter(n=>n[1]==='1707'&&fold(n[2])===fold(row.name)&&n[4]===row.academicLevel&&municipalityKey(n[6])===municipalityKey(row.municipality)&&(!row.modality||fold(n[5])===fold(row.modality)));
  const unique=[...new Map(matches.map(n=>[JSON.stringify([n[0],n[1],fold(n[5]),municipalityKey(n[6])]),n])).values()];
  if(unique.length!==1){outcomes.push({program:row.name,city:row.municipality,reason:'AMBIGUOUS_OR_MISSING_ACTIVE_IDENTITY'});continue;}
  const n=unique[0];records.push({sniesCode:n[0],institutionCode:n[1],programName:n[2],modality:n[5],municipality:n[6],amount:row.amount,source:doc.source,sourcePage:row.sourcePage,checkedAt,priceYear:year,billingPeriod:row.billingPeriod,
   note:`Acuerdo 014/2025 y adición 002/2026, tabla revisada visualmente. Matrícula completa para estudiantes nuevos ${year}, ${row.academicLevel==='Pregrado'?'franja diurna, valor por período académico':'valor por semestre'}. Media matrícula, créditos y otros derechos requieren liquidación específica.`,contentSha256:doc.sha256,reviewMethod:review.reviewMethod,collector:'TADEO_REVIEWED_PDF_V1'});
 }
 return {records,outcomes};
}

export function quarantineChangedTadeoReview(review,hashes,current){
 const changed=Object.entries(review.documents).some(([id,doc])=>hashes[id]&&hashes[id]!==doc.sha256);
 return changed?current.filter(r=>!(r.institutionCode==='1707'&&r.collector==='TADEO_REVIEWED_PDF_V1'&&r.priceYear===review.priceYear)):current;
}
