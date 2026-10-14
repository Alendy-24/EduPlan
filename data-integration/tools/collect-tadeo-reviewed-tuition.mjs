import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {extractReviewedTadeoTuition,quarantineChangedTadeoReview} from './tadeo-reviewed-tuition.mjs';
const review=JSON.parse(readFileSync(new URL('../data/tadeo-reviewed-tuition-2026.json',import.meta.url)));
const dir=new URL('../../.tools/tuition/',import.meta.url);mkdirSync(dir,{recursive:true});
const hashes={};
for(const [id,doc] of Object.entries(review.documents)){
 const url=new URL(doc.source);if(url.origin!=='https://www.utadeo.edu.co')throw new Error('Fuente Tadeo no autorizada');
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'EduPlan-tuition/1.0'}});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12_000_000)throw new Error('PDF demasiado grande');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 const bytes=Buffer.concat(chunks);if(bytes.subarray(0,4).toString()!=='%PDF')throw new Error('La fuente no devolvió PDF');
 hashes[id]=createHash('sha256').update(bytes).digest('hex');writeFileSync(new URL(`tadeo-${id}-source.pdf`,dir),bytes);
}
const names=JSON.parse(readFileSync(new URL('../data/snies-program-names.json',import.meta.url))).activeRecords;
if(!names)throw new Error('Falta índice activo');
if(process.argv.includes('--apply')){
 const file=new URL('../data/institution-tuition.json',import.meta.url),current=JSON.parse(readFileSync(file));
 const kept=quarantineChangedTadeoReview(review,hashes,current.records);
 if(kept!==current.records){
  writeFileSync(new URL('tadeo-quarantined-records.json',dir),JSON.stringify({reason:'REVIEWED_PDF_CHANGED',records:current.records.filter(r=>!kept.includes(r))},null,2)+'\n');
  const temporary=new URL('../data/institution-tuition.json.tmp',import.meta.url);
  writeFileSync(temporary,JSON.stringify({schemaVersion:1,records:kept},null,2)+'\n',{flag:'wx'});renameSync(temporary,file);
 }
}
const checkedAt=new Date().toISOString().slice(0,10),result=extractReviewedTadeoTuition(review,hashes,names,checkedAt);
const candidate=new URL('tadeo-reviewed-candidates.json',dir);writeFileSync(candidate,JSON.stringify({schemaVersion:1,records:result.records},null,2)+'\n');
writeFileSync(new URL('tadeo-reviewed-report.json',dir),JSON.stringify({checkedAt,verified:result.records.length,pending:result.outcomes},null,2)+'\n');
if(!result.records.length)throw new Error('Ninguna tarifa revisada coincide sin ambigüedad');
if(process.argv.includes('--apply')){const apply=spawnSync(process.execPath,[fileURLToPath(new URL('./apply-table-tuition.mjs',import.meta.url)),fileURLToPath(candidate)],{stdio:'inherit'});if(apply.status!==0)throw new Error('No se pudo aplicar el catálogo revisado');}
console.log(JSON.stringify({verified:result.records.length,pending:result.outcomes.length,applied:process.argv.includes('--apply')}));
