import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {municipalityKey} from '../dist/utils/municipality-key.js';
export const EAN_SOURCE='https://universidadean.edu.co/admisiones/tarifas-y-precios';
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function extractEanTuition(html,source,activeNames,checkedAt){
 if(source!==EAN_SOURCE)throw new Error('Fuente EAN no autorizada');
 const $=load(html),year=Number(checkedAt.slice(0,4)),records=[],outcomes=[];
 let tables=0;
 $('table').each((_,table)=>{
  const t=$(table),headers=t.find('tr').first().children().map((_,c)=>fold($(c).text())).get();
  if(headers[0]!=='PROGRAMA'||headers[1]!=='MODALIDAD'||headers[2]!=='SNIES')return;
  if(headers.length!==6||headers[3]!==`VALORCREDITO${year}`||headers[5]!==`VALORMATRICULA1ERSEMESTRE${year}`)throw new Error('Encabezado o vigencia EAN no reconocido');
  tables++;
  t.find('tr').slice(1).each((_,tr)=>{
   const cells=$(tr).children().map((_,c)=>$(c).text().replace(/\s+/g,' ').trim()).get();
   if(cells.length!==6){outcomes.push({status:'UNRECOGNIZED_ROW'});return;}
   const [name,mode,code,,credits,total]=cells;
   if(!/^\d+$/.test(code)||!/^\d+$/.test(credits)||!/^\$\s*\d{1,3}(?:\.\d{3})+$/.test(total)){outcomes.push({program:name,status:'NO_EXPLICIT_SEMESTER_AMOUNT'});return;}
   const matches=activeNames.filter(n=>n[0]===code&&n[1]==='2812'&&fold(n[5])===fold(mode));
   const unique=[...new Map(matches.map(n=>[JSON.stringify([n[0],n[1],fold(n[5]),municipalityKey(n[6])]),n])).values()];
   if(unique.length!==1){outcomes.push({program:name,code,status:'AMBIGUOUS_OR_MISSING_IDENTITY'});return;}
   const n=unique[0];records.push({sniesCode:n[0],institutionCode:n[1],programName:n[2],modality:n[5],municipality:n[6],amount:Number(total.replace(/\D/g,'')),source,checkedAt,priceYear:year,billingPeriod:'FIRST_ENROLLMENT',note:`Valor de matrícula del primer semestre ${year} publicado por EAN para ${credits} créditos. Se conserva el importe total publicado, sin calcularlo desde el valor por crédito. Inscripción y otros derechos se pagan por separado.`,contentSha256:createHash('sha256').update(html).digest('hex'),collector:'EAN_FIRST_SEMESTER_V1'});
  });
 });
 if(tables!==4)throw new Error('No se reconocen las cuatro tablas académicas de EAN');
 return {records,outcomes};
}
