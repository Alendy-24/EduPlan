import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { load } from 'cheerio';
import { discoverProgramUrls, extractUnabTuition, mergeCollectedPrices } from './tuition-collectors.mjs';
import { createInstitutionTuitionResolver } from '../dist/services/institution-tuition.js';
const directory=new URL('../../.tools/tuition/',import.meta.url);
mkdirSync(directory,{recursive:true});
const checkedAt=new Date().toISOString().slice(0,10);
const names=JSON.parse(readFileSync(new URL('../data/snies-program-names.json',import.meta.url))).records;
const file=new URL('../data/institution-tuition.json',import.meta.url);
const current=JSON.parse(readFileSync(file));
const records=[], outcomes=[], urls=new Set();
async function get(url) {
  const parsed=new URL(url);
  if(parsed.origin!=='https://unab.edu.co')throw new Error('Dominio de recolección no autorizado');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'EduPlan-tuition/1.0 (public official tuition research)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const reader=response.body.getReader(), chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000)throw new Error('Documento demasiado grande');chunks.push(Buffer.from(value));}}
  finally {await reader.cancel();}
  return Buffer.concat(chunks).toString('utf8');
}
try {
  const index=load(await get('https://unab.edu.co/sitemap_index.xml'),{xml:true});
  const maps=index('sitemap > loc').map((_,el)=>index(el).text().trim()).get().filter(u=>/^https:\/\/unab\.edu\.co\/project-sitemap\d*\.xml$/.test(u));
  if(!maps.length || maps.length>10)throw new Error('Sitemap de programas no reconocido');
  for(const map of maps)for(const url of discoverProgramUrls(await get(map)))urls.add(url);
} catch(error){outcomes.push({source:'https://unab.edu.co/sitemap_index.xml',status:'ERROR',reason:error.message});}
if(urls.size>400)throw new Error('El sitemap excede el límite de 400 páginas; requiere revisión');
let consecutiveErrors=0;
for(const source of urls) {
  try {
    const result=extractUnabTuition(await get(source),source,names,checkedAt);
    if(result.record)records.push(result.record);
    outcomes.push({source,status:result.record?'VERIFIED':'PENDING',reason:result.reason});
    consecutiveErrors=0;
  }catch(error){outcomes.push({source,status:'ERROR',reason:error.message});consecutiveErrors++;}
  if(outcomes.length%10===0)console.log(`Revisadas ${outcomes.length}/${urls.size}; tarifas verificadas: ${records.length}`);
  if(consecutiveErrors>=5){outcomes.push({status:'STOPPED',reason:'Cinco errores consecutivos: no se insiste sobre el sitio'});break;}
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
