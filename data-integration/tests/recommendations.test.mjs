import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { app } from '../dist/app.js';
import { normalizeAcademicText,matchingInterests,isProgramEligibleForRecommendation,satisfiesRestrictions,scoreProgram,recommendPrograms,catalogQuality } from '../dist/services/recommendations.js';
import { clearProgramCatalogCache,getProgramCatalog } from '../dist/services/program-catalog.js';
const program = { sourceId:'upr9-nkiz:row-a',code:'1',sniesCode:'123',institutionCode:'1101',institutionName:'Universidad de prueba',name:'Ingeniería de sistemas',rawName:'Antioquia',awardedTitle:'Ingeniero',nameOrigin:'SNIES_NAME',reviewRequired:false,academicLevel:'Pregrado',educationLevel:'Universitaria',knowledgeArea:'Ingeniería de sistemas, telemática y afines',broadKnowledgeArea:'Ingeniería arquitectura urbanismo y afines',modality:'Presencial',municipality:'Bogotá, D.C.',department:'Bogotá D.C.',status:'Activo',periodCount:'8',periodicity:'Semestral',nameSource:'SNIES',nameImportedAt:'2026-09-30' };
const profile = { preferences:{academicLevel:'Pregrado',modality:'Presencial',municipality:'Bogotá',department:'Bogotá D.C.',mobility:'CITY'},areas:['Tecnología'] };
const withPreferences = changes => ({...profile,preferences:{...profile.preferences,...changes}});
test('NBC normalization handles accents, case, whitespace and punctuation without using raw names',()=> {
  assert.equal(normalizeAcademicText('  INGENIERÍA  de Sistemas, Telemática Y afines '),'ingenieria de sistemas telematica y afines');
  assert.deepEqual(matchingInterests(program,['Tecnología','Salud']),['Tecnología']);
  assert.deepEqual(matchingInterests(program,['  TECNOLOGIA  ']),['Tecnología']);
  assert.deepEqual(matchingInterests({...program,knowledgeArea:'Educación'},['Tecnología']),[]);
  assert.deepEqual(matchingInterests(program,['toString']),[]);
});
test('eligibility requires active source identity and a resolved academic name, not a raw department or degree title',()=> {
  assert.equal(isProgramEligibleForRecommendation(program),true);
  for(const changes of [{status:'Inactivo'},{institutionCode:''},{institutionName:'NA'},{nameOrigin:'UNAVAILABLE'},{reviewRequired:true},{sourceId:''},{code:''},{academicLevel:''},{knowledgeArea:''},{name:''}]) assert.equal(isProgramEligibleForRecommendation({...program,...changes}),false,JSON.stringify(changes));
  assert.equal(isProgramEligibleForRecommendation({...program,sniesCode:''}),true);
});
test('restrictions use academic level, city or department, never modality as a hard filter',()=> {
  assert.equal(satisfiesRestrictions(program,profile),true);
  assert.equal(satisfiesRestrictions(program,withPreferences({academicLevel:'Posgrado'})),false);
  assert.equal(satisfiesRestrictions(program,withPreferences({municipality:'Medellín'})),false);
  assert.equal(satisfiesRestrictions(program,withPreferences({mobility:'DEPARTMENT',department:'Antioquia'})),false);
  assert.equal(satisfiesRestrictions(program,withPreferences({modality:'Virtual'})),true);
  for(const mobility of ['ANY','RELOCATE','']) assert.equal(satisfiesRestrictions(program,withPreferences({mobility,municipality:'Medellín'})),true);
});
test('score uses normalized configured weights and deterministic positive explanations',()=> {
  const result = scoreProgram(program,profile);
  assert.equal(result.score,100); assert(result.reasons.some(r=>r.includes('Tecnología'))); assert(result.reasons.some(r=>r.includes('Presencial'))); assert(result.reasons.some(r=>r.includes('Bogotá')));
  assert.deepEqual(result.matchedCriteria,['academicLevel','interests','modality','location']);
  assert.equal(scoreProgram(program,withPreferences({modality:'Virtual'})).score,78);
  assert.equal(scoreProgram(program,withPreferences({modality:'Virtual',mobility:'ANY'})).score,71);
  assert.equal(scoreProgram(program,withPreferences({modality:'',mobility:'ANY'})).score,100);
  assert.equal(scoreProgram({...program,municipality:'Medellín'},withPreferences({mobility:'ANY'})).score,100);
  assert.equal(result.provenance.algorithmVersion,'nbc-v1');
});
test('missing metadata is explicit and never replaced by invented costs or employment',()=> {
  const result = scoreProgram({...program,modality:'',sniesCode:'',periodCount:''},profile);
  assert.equal(result.score,78); assert(result.missingInformation.includes('Modalidad no disponible'));
  assert(result.missingInformation.some(v=>v.includes('SNIES'))); assert(result.missingInformation.includes('Duración incompleta'));
  assert.equal(result.program.cost,undefined);
});
test('incomplete profiles return no fake 0% scores',()=> {
  for(const value of [{...profile,areas:[]},{...profile,areas:['toString']},withPreferences({academicLevel:''}),withPreferences({municipality:''}),withPreferences({mobility:'DEPARTMENT',department:''})]) {
    assert.equal(scoreProgram(program,value),null); assert.equal(recommendPrograms([program],value).status,'INCOMPLETE_PROFILE');
  }
});
test('ranking deduplicates, excludes explicit IDs, caps at 50 and is stable across input order',()=> {
  const candidates=Array.from({length:70},(_,n)=>({...program,sourceId:'upr9-nkiz:row-'+String(n).padStart(3,'0')}));
  const first=recommendPrograms([...candidates,candidates[0]],profile,100,['upr9-nkiz:row-000']);
  assert.equal(first.data.length,50); assert.equal(first.eligibleCount,69); assert.equal(first.data[0].program.sourceId,'upr9-nkiz:row-001');
  assert.deepEqual(first,recommendPrograms(candidates.toReversed(),profile,100,['upr9-nkiz:row-000']));
  assert.equal(recommendPrograms([{...program,status:'Inactivo'}],profile).status,'NO_RESULTS');
});
test('quality report separates name resolution, review, activity and field coverage',()=> {
  const report=catalogQuality([program,{...program,nameOrigin:'UNAVAILABLE',reviewRequired:true,status:'Inactivo',sniesCode:'',knowledgeArea:''}]);
  assert.equal(report.total,2); assert.equal(report.resolvedNames.percent,50); assert.equal(report.reviewRequired.count,1); assert.equal(report.active.count,1); assert.equal(report.inactive.count,1); assert.equal(report.sniesCode.percent,50); assert.equal(report.duplicateSourceIds,1);
});
async function post(server,body) {
  return new Promise((resolve,reject)=> { const req=httpRequest({hostname:'127.0.0.1',port:server.address().port,path:'/api/recommendations',method:'POST',headers:{'Content-Type':'application/json'}},res=> { let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(raw)})); }); req.on('error',reject);req.end(JSON.stringify(body)); });
}
test('API rejects prototype keys and excessive limits, skips source for incomplete profile, caps details',async t=> {
  const server=app.listen(0); t.after(()=>server.close());
  for(const change of [{areas:['toString']},{limit:51},{excludedSourceIds:Array(201).fill('x')},{sourceIds:Array(4).fill(program.sourceId)},{preferences:{...profile.preferences,mobility:'unknown'}}]) assert.equal((await post(server,{...profile,...change})).status,400);
  const incomplete=await post(server,{...profile,areas:[]}); assert.equal(incomplete.status,200); assert.equal(incomplete.data.status,'INCOMPLETE_PROFILE');
});
test('API calculates from cached catalog without sending every candidate to the browser',async t=> {
  clearProgramCatalogCache(); t.after(clearProgramCatalogCache);
  t.mock.method(globalThis,'fetch',async()=>Response.json([{},{}]));
  let sequence=0;
  await getProgramCatalog('fixture',()=>({...program,sourceId:sequence++===0 ? program.sourceId : 'upr9-nkiz:row-b'}));
  const server=app.listen(0);t.after(()=>server.close());
  const result=await post(server,{...profile,limit:1});
  assert.equal(result.status,200); assert.equal(result.data.data.length,1); assert.equal(result.data.status,'OK');assert.equal(result.data.data[0].score,100);
  const details=await post(server,{...profile,sourceIds:['upr9-nkiz:row-b']});
  assert.equal(details.data.data.length,1);assert.equal(details.data.data[0].program.sourceId,'upr9-nkiz:row-b');
  const excluded=await post(server,{...profile,excludedSourceIds:[program.sourceId]});
  assert.equal(excluded.data.data.length,1);assert.equal(excluded.data.data[0].program.sourceId,'upr9-nkiz:row-b');
});
