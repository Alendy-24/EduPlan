import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {municipalityKey} from '../dist/utils/municipality-key.js';
export const LIBRE_INDEX='https://www.unilibre.edu.co/derechos-pecuniarios/';
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const clean=s=>s.replace(/\s+/g,' ').trim();
const campuses={BOGOTA:['1806','Bogotá, D.C.'],BARRANQUILLA:['1808','Barranquilla'],CALI:['1807','Santiago de Cali'],PEREIRA:['1809','Pereira'],CARTAGENA:['1806','Cartagena'],CUCUTA:['1810','San José de Cúcuta'],ELSOCORRO:['1811','Socorro']};
export const LIBRE_RESOLUTION='https://www.unilibre.edu.co/normativas/resolucion-n-o-43-de-2025-derechos-pecuniarios-2026/';
export function extractLibreTuition(html,source,activeNames,checkedAt){
  if(new URL(source).origin!=='https://www.unilibre.edu.co')throw new Error('Fuente Libre no autorizada');
  const $=load(html),year=Number(checkedAt.slice(0,4)),records=[],outcomes=[];
  const seen=new Set(),hash=createHash('sha256').update(html).digest('hex');
  $('table').each((_,table)=>{
    const t=$(table),heading=clean(t.parent().prev().text());
    const match=heading.match(/^Artículo\s+\d+\. De la Seccional ([^.]+)\./i);
    if(!match||!heading.includes(`vigencia ${year}`))return;
    const campus=campuses[fold(match[1])];if(!campus||seen.has(fold(match[1])))throw new Error('Seccional duplicada o desconocida');
    seen.add(fold(match[1]));
    if(!new RegExp(`VALOR(?:ES)?DEMATRICULA${year}`).test(fold(t.find('tr').first().text())))throw new Error('Encabezado de tarifa no reconocido');
    const cycleHeader=fold(t.find('tr').eq(1).text());if(cycleHeader!=='CICLOICICLOII')throw new Error('Columnas de ciclos no reconocidas');
    let section='',carry='',remaining=0;
    t.find('tr').slice(2).each((_,row)=>{
      const cells=$(row).children('td,th');let values=cells.map((_,c)=>clean($(c).text())).get();
      if(values.length===1){section=fold(values[0]);carry='';remaining=0;return;}
      if(values.length===3&&remaining>0){values.unshift(carry);remaining--;}
      else if(values.length===4){carry=values[0];remaining=Math.max(0,Number(cells.first().attr('rowspan')??1)-1);}
      else {outcomes.push({campus:match[1],status:'UNRECOGNIZED_ROW'});return;}
      const [label,period,first,second]=values;
      if(!['PREGRADO','POSGRADO'].includes(section))return;
      if(!/^I(?:\s*[-–]\s*[IVX]+)?$/.test(period)&&fold(period)!=='ANO')return;
      const money=s=>/^\$\s*\d{1,3}(?:\.\d{3})+$/.test(s)?Number(s.replace(/\D/g,'')):undefined;
      const amount=money(first);if(!amount||amount!==money(second)){outcomes.push({campus:match[1],program:label,status:'NO_UNIQUE_AMOUNT'});return;}
      const explicitMode=label.match(/\((Virtual|Presencial)\)/i)?.[1];
      const name=label.replace(/\s*\((?:Virtual|Presencial|Anual)\)/gi,'').replace(/\s+(?:semestralizado|anualizado)$/i,'').trim();
      const matches=activeNames.filter(r=>String(r[1])===campus[0]&&municipalityKey(r[6])===municipalityKey(campus[1])&&fold(r[2])===fold(name)&&(!explicitMode||fold(r[5])===fold(explicitMode))&&fold(r[4])===section);
      const unique=[...new Map(matches.map(r=>[JSON.stringify([r[0],r[1],fold(r[5]),municipalityKey(r[6])]),r])).values()];
      if(unique.length!==1){outcomes.push({campus:match[1],program:label,status:'AMBIGUOUS_OR_MISSING_IDENTITY',matches:unique.length});return;}
      const r=unique[0],annual=fold(period)==='ANO'||/\(Anual\)|anualizado/i.test(label);
      records.push({sniesCode:String(r[0]),institutionCode:String(r[1]),programName:r[2],modality:r[5],municipality:r[6],amount,source,checkedAt,priceYear:year,billingPeriod:/semestralizado/i.test(label)?'SEMESTER':'ACADEMIC_PERIOD',note:`Resolución oficial de derechos pecuniarios ${year}, seccional ${match[1]}. Valor de matrícula ${annual?'anual':/semestralizado/i.test(label)?'por semestre':'por período académico (la tabla encabeza «semestre o año»)'} para ${period}; igual en ciclos I y II. No incluye otros derechos pecuniarios.`,evidenceHash:hash});
    });
  });
  if(seen.size!==7)throw new Error('La resolución no contiene las siete tablas de seccionales vigentes');
  return {records,outcomes};
}
