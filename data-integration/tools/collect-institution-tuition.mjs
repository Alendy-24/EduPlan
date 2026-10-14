import {extractGuajiraTuition, GUAJIRA_SOURCE} from './guajira-tuition.mjs';
import {extractCesTuition, CES_SOURCE} from './ces-tuition.mjs';
import {extractEanTuition, EAN_SOURCE} from './ean-tuition.mjs';
import {extractLibreTuition, LIBRE_RESOLUTION} from './libre-tuition.mjs';
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { load } from 'cheerio';
import { discoverProgramUrls, extractUnabTuition, discoverJaverianaCaliUrls, extractJaverianaCaliTuition, mergeCollectedPrices } from './tuition-collectors.mjs';
import { createInstitutionTuitionResolver } from '../dist/services/institution-tuition.js';
import { extractSenaFreeTraining, SENA_POLICY_SOURCE, SENA_CONFIRMATION_SOURCE } from './tuition-collectors.mjs';
const directory=new URL('../../.tools/tuition/',import.meta.url);
mkdirSync(directory,{recursive:true});
const checkedAt=new Date().toISOString().slice(0,10);
const nameIndex=JSON.parse(readFileSync(new URL('../data/snies-program-names.json',import.meta.url)));
const names=nameIndex.records;
const file=new URL('../data/institution-tuition.json',import.meta.url);
const current=JSON.parse(readFileSync(file));
const records=[], outcomes=[], urls=new Set();
const selected=process.argv.find(arg=>arg.startsWith('--source='))?.split('=')[1];
if(selected&&!['unab','javeriana-cali','sena','libre','ean','ces','guajira'].includes(selected))throw new Error('Recolector no reconocido');
async function get(url) {
  const parsed=new URL(url);
  if(!['https://uniguajira.edu.co','https://www.ces.edu.co','https://universidadean.edu.co','https://www.unilibre.edu.co','https://unab.edu.co','https://www.javerianacali.edu.co','https://ape.sena.edu.co','https://historico.sena.edu.co'].includes(parsed.origin))throw new Error('Dominio de recolección no autorizado');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'EduPlan-tuition/1.0 (public official tuition research)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const reader=response.body.getReader(), chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000)throw new Error('Documento demasiado grande');chunks.push(Buffer.from(value));}}
  finally {await reader.cancel();}
  return Buffer.concat(chunks).toString('utf8');
}
if(!selected||selected==='unab')try {
  const index=load(await get('https://unab.edu.co/sitemap_index.xml'),{xml:true});
  const maps=index('sitemap > loc').map((_,el)=>index(el).text().trim()).get().filter(u=>/^https:\/\/unab\.edu\.co\/project-sitemap\d*\.xml$/.test(u));
  if(!maps.length || maps.length>10)throw new Error('Sitemap de programas no reconocido');
  for(const map of maps)for(const url of discoverProgramUrls(await get(map)))urls.add(url);
} catch(error){outcomes.push({source:'https://unab.edu.co/sitemap_index.xml',status:'ERROR',reason:error.message});}
if(!selected||selected==='javeriana-cali')try {
  for(const url of discoverJaverianaCaliUrls(await get('https://www.javerianacali.edu.co/programas/carreras')))urls.add(url);
}catch(error){outcomes.push({source:'https://www.javerianacali.edu.co/programas/carreras',status:'ERROR',reason:error.message});}
if(!selected||selected==='sena')try {
  if(!nameIndex.activeRecords)throw new Error('Faltan identidades activas verificadas de SNIES');
  const result=extractSenaFreeTraining(await get(SENA_POLICY_SOURCE),await get(SENA_CONFIRMATION_SOURCE),nameIndex.activeRecords,checkedAt);
  records.push(...result.records);
  outcomes.push({source:SENA_POLICY_SOURCE,status:result.records.length?'VERIFIED':'PENDING',offers:result.records.length,reason:result.reason});
}catch(error){outcomes.push({source:SENA_POLICY_SOURCE,status:'ERROR',reason:error.message});}
if(!selected||selected==='libre')try {
  if(!nameIndex.activeRecords)throw new Error('Faltan identidades activas verificadas de SNIES');
  const html=await get(LIBRE_RESOLUTION);
  const result=extractLibreTuition(html,LIBRE_RESOLUTION,nameIndex.activeRecords,checkedAt);
  records.push(...result.records);
  writeFileSync(new URL('libre-resolution.html',directory),html);
  outcomes.push({source:LIBRE_RESOLUTION,status:result.records.length?'VERIFIED':'PENDING',offers:result.records.length,pending:result.outcomes});
}catch(error){outcomes.push({source:LIBRE_RESOLUTION,status:'ERROR',reason:error.message});}
if(!selected||selected==='ean')try {
  if(!nameIndex.activeRecords)throw new Error('Faltan identidades activas verificadas de SNIES');
  const html=await get(EAN_SOURCE);
  const result=extractEanTuition(html,EAN_SOURCE,nameIndex.activeRecords,checkedAt);
  records.push(...result.records);
  writeFileSync(new URL('ean-tariffs.html',directory),html);
  outcomes.push({source:EAN_SOURCE,status:result.records.length?'VERIFIED':'PENDING',offers:result.records.length,pending:result.outcomes});
}catch(error){outcomes.push({source:EAN_SOURCE,status:'ERROR',reason:error.message});}
if(!selected||selected==='ces')try {
  if(!nameIndex.activeRecords)throw new Error('Faltan identidades activas verificadas de SNIES');
  const html=await get(CES_SOURCE);
  const result=extractCesTuition(html,CES_SOURCE,nameIndex.activeRecords,checkedAt);
  records.push(...result.records);
  writeFileSync(new URL('ces-tariffs.html',directory),html);
  outcomes.push({source:CES_SOURCE,status:result.records.length?'VERIFIED':'PENDING',offers:result.records.length,pending:result.outcomes});
}catch(error){outcomes.push({source:CES_SOURCE,status:'ERROR',reason:error.message});}
if(!selected||selected==='guajira')try {
  if(!nameIndex.activeRecords||!nameIndex.activeDetails)throw new Error('Falta contexto oficial activo de formación');
  const html=await get(GUAJIRA_SOURCE);
  const result=extractGuajiraTuition(html,GUAJIRA_SOURCE,nameIndex.activeRecords,nameIndex.activeDetails,checkedAt);
  records.push(...result.records);
  writeFileSync(new URL('guajira-tariffs.html',directory),html);
  outcomes.push({source:GUAJIRA_SOURCE,status:result.records.length?'VERIFIED':'PENDING',offers:result.records.length,pending:result.outcomes});
}catch(error){outcomes.push({source:GUAJIRA_SOURCE,status:'ERROR',reason:error.message});}
if(urls.size>400)throw new Error('El sitemap excede el límite de 400 páginas; requiere revisión');
let consecutiveErrors=0, previousOrigin='';
const blockedOrigins=new Set();
for(const source of urls) {
  const origin=new URL(source).origin;
  if(blockedOrigins.has(origin))continue;
  if(origin!==previousOrigin){consecutiveErrors=0;previousOrigin=origin;}
  try {
    const extractor=origin==='https://unab.edu.co'?extractUnabTuition:extractJaverianaCaliTuition;
    const result=extractor(await get(source),source,names,checkedAt);
    if(result.record)records.push(result.record);
    outcomes.push({source,status:result.record?'VERIFIED':'PENDING',reason:result.reason});
    consecutiveErrors=0;
  }catch(error){outcomes.push({source,status:'ERROR',reason:error.message});consecutiveErrors++;}
  if(outcomes.length%10===0)console.log(`Revisadas ${outcomes.length}/${urls.size}; tarifas verificadas: ${records.length}`);
  if(consecutiveErrors>=5){outcomes.push({source:origin,status:'STOPPED',reason:'Cinco errores consecutivos: no se insiste sobre el sitio'});blockedOrigins.add(origin);}
  // Bound requests to this official site; no concurrent crawl or retries on blocks.
  await new Promise(resolve=>setTimeout(resolve,400));
}
const merged=mergeCollectedPrices(current.records,records);
const candidate={schemaVersion:1,records:merged.records};
createInstitutionTuitionResolver(candidate);
writeFileSync(new URL('institution-candidates.json',directory),JSON.stringify({schemaVersion:1,records},null,2)+'\n');
writeFileSync(new URL('collection-report.json',directory),JSON.stringify({checkedAt,discovered:urls.size,verified:records.length,conflicts:merged.conflicts,outcomes},null,2)+'\n');
if(process.argv.includes('--apply')&&records.length){
  const temporary=new URL('../data/institution-tuition.json.tmp',import.meta.url);
  writeFileSync(temporary,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});renameSync(temporary,file);
}
console.log(JSON.stringify({discovered:urls.size,verified:records.length,conflicts:merged.conflicts.length,total:merged.records.length,applied:process.argv.includes('--apply')&&records.length>0}));
if(!records.length)process.exitCode=1;
