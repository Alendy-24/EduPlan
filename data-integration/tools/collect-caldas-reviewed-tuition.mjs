import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {extractReviewedCaldasTuition,CALDAS_SOURCE} from './caldas-reviewed-tuition.mjs';
const review=JSON.parse(readFileSync(new URL('../data/caldas-reviewed-tuition-2026.json',import.meta.url)));
const directory=new URL('../../.tools/tuition/',import.meta.url);mkdirSync(directory,{recursive:true});
const response=await fetch(CALDAS_SOURCE,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'EduPlan-tuition/1.0'}});
if(!response.ok)throw new Error(`HTTP ${response.status}`);
const reader=response.body.getReader(),chunks=[];let size=0;
try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12_000_000)throw new Error('PDF demasiado grande');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
const pdf=Buffer.concat(chunks);if(pdf.subarray(0,4).toString()!=='%PDF')throw new Error('La fuente no devolvió PDF');
const hash=createHash('sha256').update(pdf).digest('hex');writeFileSync(new URL('caldas-reviewed-source.pdf',directory),pdf);
if(hash!==review.contentSha256&&process.argv.includes('--apply')){
 const file=new URL('../data/institution-tuition.json',import.meta.url),current=JSON.parse(readFileSync(file));
 const removed=current.records.filter(r=>r.institutionCode==='1112'&&r.collector==='CALDAS_REVIEWED_PDF_V1'&&r.priceYear===review.priceYear);
 writeFileSync(new URL('caldas-quarantined-records.json',directory),JSON.stringify({reason:'REVIEWED_PDF_CHANGED',records:removed},null,2)+'\n');
 const temporary=new URL('../data/institution-tuition.json.tmp',import.meta.url);
 writeFileSync(temporary,JSON.stringify({schemaVersion:1,records:current.records.filter(r=>!removed.includes(r))},null,2)+'\n',{flag:'wx'});renameSync(temporary,file);
}
const names=JSON.parse(readFileSync(new URL('../data/snies-program-names.json',import.meta.url))).activeRecords;
if(!names)throw new Error('Falta índice activo');
const checkedAt=new Date().toISOString().slice(0,10),result=extractReviewedCaldasTuition(review,hash,names,checkedAt);
const candidate=new URL('caldas-reviewed-candidates.json',directory);
writeFileSync(candidate,JSON.stringify({schemaVersion:1,records:result.records},null,2)+'\n');
writeFileSync(new URL('caldas-reviewed-report.json',directory),JSON.stringify({checkedAt,verified:result.records.length,pending:result.outcomes},null,2)+'\n');
if(!result.records.length)throw new Error('Ningún importe revisado coincide inequívocamente');
if(process.argv.includes('--apply')){const result=spawnSync(process.execPath,[fileURLToPath(new URL('./apply-table-tuition.mjs',import.meta.url)),fileURLToPath(candidate)],{stdio:'inherit'});if(result.status!==0)throw new Error('No se pudo incorporar la revisión');}
console.log(JSON.stringify({verified:result.records.length,pending:result.outcomes.length,applied:process.argv.includes('--apply')}));
