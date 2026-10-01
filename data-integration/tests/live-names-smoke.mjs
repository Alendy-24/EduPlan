import assert from 'node:assert/strict';
import { getPrograms } from '../dist/services/programs.service.js';
const start = performance.now();
for (const [code, city, website, campus] of [['1701','Bogotá','www.javeriana.edu.co','Principal'],['1702','Cali','www.puj.edu.co','Seccional']]) {
  const programs = await getPrograms({name:'ingenieria de sistemas',academicLevel:'Pregrado',institutionCode:code,page:1,limit:100});
  assert(programs.length>0, 'Empty campus ' + code);
  assert(programs.every(program => program.institutionCode===code && program.institutionWebsite===website && program.institutionCampus===campus && program.institutionMunicipality.includes(city)));
  const named = programs.filter(program=>program.nameOrigin==='SNIES_NAME');
  if (!named.length) console.log(JSON.stringify(programs.map(p=>({code:p.code,institutionCode:p.institutionCode,title:p.awardedTitle,rawName:p.rawName,name:p.name}))));
  assert(named.length>0); assert(named.every(program=>program.name!==program.awardedTitle));
  console.log(JSON.stringify({code,city:programs[0].institutionMunicipality,campus,website,rows:programs.length,named:named.length,example:named[0].name,title:named[0].awardedTitle,sourceId:named[0].sourceId}));
}
const ordered = await getPrograms({academicLevel:'Pregrado',institutionCode:'1701',order:'asc',page:1,limit:12});
assert.equal(ordered.length,12);
const collator = new Intl.Collator('es',{sensitivity:'base',numeric:true});
assert(ordered.every((program,i)=>!i||collator.compare(ordered[i-1].name,program.name)<=0));
console.log('PASS: official live campuses and joined names; global A–Z; total '+ Math.round(performance.now()-start)+'ms');
