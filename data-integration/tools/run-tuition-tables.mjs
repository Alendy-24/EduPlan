import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const local=fileURLToPath(new URL(process.platform==='win32'?'../../.tools/tuition-python/Scripts/python.exe':'../../.tools/tuition-python/bin/python',import.meta.url));
const python=process.env.EDUPLAN_TUITION_PYTHON || (existsSync(local)?local:'python3');
let failed=false;
for(const script of ['collect-tuition-tables.py','collect-uao-postgraduate-tuition.py','collect-upb-tuition.py','collect-unimetro-tuition.py','collect-unitecnar-tuition.py']) {
  const result=spawnSync(python,[fileURLToPath(new URL('./'+script,import.meta.url)),'--apply'],{stdio:'inherit'});
  if(result.error)console.error(result.error.message);
  if(result.status!==0)failed=true;
}
for(const script of ['collect-tadeo-reviewed-tuition.mjs','collect-caldas-reviewed-tuition.mjs']) {
 const reviewed=spawnSync(process.execPath,[fileURLToPath(new URL('./'+script,import.meta.url)),'--apply'],{stdio:'inherit'});
 if(reviewed.error)console.error(reviewed.error.message);
 if(reviewed.status!==0)failed=true;
}
process.exitCode=failed?1:0;
