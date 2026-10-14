import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {municipalityKey} from '../dist/utils/municipality-key.js';
export const CES_SOURCE='https://www.ces.edu.co/becas-y-apoyo-financiero/tarifas-derechos-pecuniarios/';
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function extractCesTuition(html,source,names,checkedAt){
 if(source!==CES_SOURCE)throw new Error('Fuente CES no autorizada');
 const $=load(html),year=Number(checkedAt.slice(0,4)),records=[],outcomes=[];
 const sections=$('.accordion-item').filter((_,a)=>fold($(a).children('.accordion-header').text())===`DERECHOSDEMATRICULA${year}`);
 if(sections.length!==1)throw new Error('Sección de matrícula CES vigente ausente o ambigua');
 sections.find('table tbody tr').each((_,row)=>{
  const cells=$(row).children('td');if(cells.length!==2)return;
  const label=cells.eq(0).text().replace(/\s+/g,' ').trim(),value=cells.eq(1).text().replace(/\s+/g,' ').trim();
  if(/cr[eé]dit|promedio|aproximad|desde|beca|descuento|\(|\)|\d/i.test(label)||!/^COP\s+\d{1,3}(?:\.\d{3})+$/.test(value)){outcomes.push({program:label,status:'NO_FIXED_UNAMBIGUOUS_TUITION'});return;}
  const name=label.replace(/^Pregrado(?: en)?\s+/i,'');
  const matches=names.filter(n=>n[1]==='2708'&&fold(n[2])===fold(name));
  const unique=[...new Map(matches.map(n=>[JSON.stringify([n[0],n[1],fold(n[5]),municipalityKey(n[6])]),n])).values()];
  if(unique.length!==1){outcomes.push({program:label,status:'AMBIGUOUS_OR_MISSING_ACTIVE_IDENTITY'});return;}
  const n=unique[0];records.push({sniesCode:n[0],institutionCode:n[1],programName:n[2],modality:n[5],municipality:n[6],amount:Number(value.replace(/\D/g,'')),source,checkedAt,priceYear:year,billingPeriod:'ACADEMIC_PERIOD',note:`Derechos de matrícula ${year} publicados por Universidad CES para el programa. La tabla no especifica la duración del período cobrado; confirma esa duración y los otros derechos con la institución. No corresponde a inscripción ni a valor por crédito.`,contentSha256:createHash('sha256').update(html).digest('hex'),collector:'CES_FIXED_TUITION_V1'});
 });
 return {records,outcomes};
}
