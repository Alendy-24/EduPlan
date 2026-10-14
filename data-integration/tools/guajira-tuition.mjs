import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {municipalityKey} from '../dist/utils/municipality-key.js';
export const GUAJIRA_SOURCE='https://uniguajira.edu.co/oficina-de-registro-y-control-academico/valores-de-matriculas/';
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function extractGuajiraTuition(html,source,names,details,checkedAt){
 if(source!==GUAJIRA_SOURCE)throw new Error('Fuente Uniguajira no autorizada');
 const $=load(html),year=Number(checkedAt.slice(0,4)),records=[],outcomes=[];
 const scope=$('.ug-stats').filter((_,s)=>$(s).find('h2').filter((_,h)=>fold($(h).text())===`PARALAVIGENCIA${year}`).length===1);
 if(scope.length!==1)throw new Error('No se confirma una única vigencia Uniguajira');
 const rates=new Map();
 for(const [label,formation] of [['MATRICULAORDINARIAMAESTRIAS','MAESTRIA'],['VALORMATRICULAORDINARIAESPECIALIZACIONES','ESPECIALIZACIONUNIVERSITARIA'],['VALORMATRICULAORDINARIADOCTORADOS','DOCTORADO']]){
  const labels=scope.find('.ug-stats__label').filter((_,el)=>fold($(el).text())===label);
  if(labels.length!==1)throw new Error('Tarifa ordinaria de posgrado ausente o ambigua');
  const amount=labels.closest('.ug-stats__card').find('.ug-stats__amount');
  const value=amount.text().trim();
  if(amount.length!==1||!/^\d{1,3}(?:\.\d{3})+$/.test(value))throw new Error('Monto de posgrado inválido');
  const total=Number(value.replaceAll('.',''));
  if(amount.attr('data-ug-count')&&Number(amount.attr('data-ug-count'))!==total)throw new Error('El texto y el contador institucional difieren');
  rates.set(formation,total);
 }
 const formations=new Map();
 const key=(code,institution,mode,city)=>JSON.stringify([code,institution,fold(mode),municipalityKey(city)]);
 for(const d of details??[]){const id=key(d[0],d[1],d[2],d[3]),values=formations.get(id)??new Set();values.add(fold(d[4]));formations.set(id,values);}
 for(const n of names.filter(n=>n[1]==='1218'&&n[4]==='Posgrado')){
  const values=formations.get(key(n[0],n[1],n[5],n[6]));
  if(values?.size!==1||!rates.has([...values][0])){outcomes.push({sniesCode:n[0],reason:'NO_UNAMBIGUOUS_OFFICIAL_FORMATION_RATE'});continue;}
  records.push({sniesCode:n[0],institutionCode:n[1],programName:n[2],modality:n[5],municipality:n[6],amount:rates.get([...values][0]),source,checkedAt,priceYear:year,billingPeriod:'ACADEMIC_PERIOD',note:`Matrícula ordinaria de posgrado publicada por Uniguajira para la vigencia ${year}, según nivel de formación oficial. La página no declara la duración del período cobrado. No corresponde a matrícula extraordinaria, inscripción ni a gratuidad; beneficios y otros derechos requieren liquidación individual.`,contentSha256:createHash('sha256').update(html).digest('hex'),collector:'UNIGUAJIRA_ORDINARY_POSTGRADUATE_V1'});
 }
 return {records,outcomes};
}
