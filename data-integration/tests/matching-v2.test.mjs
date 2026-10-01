import test from 'node:test';
import assert from 'node:assert/strict';
import {RECOMMENDATION_CONFIG as config,emptyRefinement,durationMonths,formationFor,validRefinement} from '../dist/config/recommendations.js';
import {scoreProgram,recommendPrograms,academicAffinity} from '../dist/services/recommendations.js';
import observed from './fixtures/catalog-observed-2026-09-30.json' with {type:'json'};
import {normalizeAcademicText as key} from '../dist/config/recommendations.js';
const nbc=prefix=>config.nbcs.find(n=>n.name.toLowerCase().startsWith(prefix.toLowerCase())).name;
const program=(id,prefix,changes={})=>({sourceId:'upr9-nkiz:'+id,code:id,institutionCode:'1',institutionName:'Universidad QA',name:id,nameOrigin:'SNIES_NAME',reviewRequired:false,academicLevel:'Pregrado',educationLevel:'Universitaria',modality:'Presencial',municipality:'Bogotá, D.C.',department:'Bogotá D.C.',status:'Activo',periodCount:'8',periodicity:'Semestral',sniesCode:'1',knowledgeArea:nbc(prefix),broadKnowledgeArea:config.nbcs.find(n=>n.name===nbc(prefix)).broadArea,institutionSector:'Oficial',...changes});
const candidates=[program('sistemas','Ingeniería de sistemas'),program('industrial','Ingeniería industrial'),program('telecom','Ingeniería electrónica'),program('administracion','Administración'),program('contaduria','Contaduría'),program('economia','Economía'),program('medicina','Medicina'),program('enfermeria','Enfermería'),program('diseno','Diseño')];
const profile=(areas,refinement={},preferences={})=>({areas,motivations:[],preferences:{academicLevel:'Pregrado',educationLevel:'UNIVERSITY',modality:'Presencial',municipality:'Bogotá',department:'Bogotá D.C.',mobility:'CITY',...preferences},refinement:{...emptyRefinement,...refinement}});
const technology=profile(['Tecnología'],{specificNbcs:[nbc('Ingeniería de sistemas')],activities:['Resolver problemas','Desarrollar tecnología','Analizar datos'],contexts:['Datos'],locationImportance:'HIGH',modalityImportance:'PREFERRED'});
test('configuration matches the independently captured MEN taxonomy, formations and unambiguous periodicities',()=>{
 assert.equal(config.source.observedAt,observed.observedAt);
 assert.equal(new Set(config.nbcs.map(n=>key(n.name))).size,config.nbcs.length);
 for(const n of config.nbcs)assert(observed.nbcBroadArea.some(row=>row.nombrenbc&&key(row.nombrenbc)===key(n.name)&&key(row.nombreareaconocimiento)===key(n.broadArea)),n.name);
 for(const f of config.formations)assert(observed.academicFormation.some(row=>row.nombrenivelacademico===f.academicLevel&&row.nombrenivelformacion===f.raw&&Number(row.count)===f.count),f.raw);
 for(const unit of Object.keys(config.periodMonths))assert(observed.periodicity.some(row=>row.nombreperiodicidad&&key(row.nombreperiodicidad)===key(unit)),unit);
});
test('central weights sum to 100; taxonomy and all cue/related NBCs are real observed labels',()=>{
 assert.equal(Object.values(config.weights).reduce((a,b)=>a+b,0),100);assert.equal(new Set(config.nbcs.map(n=>n.name)).size,config.nbcs.length);
 const names=new Set(config.nbcs.map(n=>n.name));for(const item of [...config.activities,...config.contexts]){assert(item.rationale);for(const r of item.relations){assert(names.has(r.nbc));assert(r.strength>0&&r.strength<=1);}}
 for(const pair of config.relationships){assert(names.has(pair.a)&&names.has(pair.b));assert(pair.strength>0&&pair.strength<1);}
});
test('academic level and formation are separate; specializations preserve every observed raw subtype',()=>{
 assert.equal(formationFor('Pregrado','Formación técnica profesional').id,'TECHNICAL');assert.equal(formationFor('Pregrado','UNIVERSITARIA').id,'UNIVERSITY');
 const specialization=config.formations.filter(f=>f.academicLevel==='Posgrado'&&f.id==='SPECIALIZATION');assert.equal(specialization.length,4);assert(specialization.some(f=>f.raw==='Especialización médico quirúrgica'));
 assert.equal(scoreProgram(program('tecnico','Ingeniería de sistemas',{educationLevel:'Formación técnica profesional'}),technology),null);
 assert.equal(scoreProgram(program('maestria','Ingeniería de sistemas',{academicLevel:'Posgrado',educationLevel:'Maestría'}),technology),null);
});
test('A: Systems/software/computing outrank industrial, business and marketing NBCs without a cap',()=>{
 const ranked=recommendPrograms(candidates,technology);assert.equal(ranked.data[0].program.sourceId,'upr9-nkiz:sistemas');
 assert(ranked.data.find(r=>r.program.sourceId==='upr9-nkiz:telecom').score>ranked.data.find(r=>r.program.sourceId==='upr9-nkiz:administracion').score);
 assert.equal(ranked.data[0].evidence.level,'SUFFICIENT');assert(!ranked.data.every(r=>r.score===100));assert(new Set(ranked.data.map(r=>r.score)).size>=4);
});
test('B: business activities lift administration, finance and accounting over technology',()=>{
 const ranked=recommendPrograms(candidates,profile(['Negocios'],{specificNbcs:[nbc('Administración'),nbc('Contaduría'),nbc('Economía')],activities:['Liderar equipos','Comunicar o negociar','Trabajar con números']}));
 assert(ranked.data.slice(0,3).every(r=>['administracion','economia','contaduria'].includes(r.program.name)));
});
test('C: health NBCs dominate for care and research preferences',()=>{
 const ranked=recommendPrograms(candidates,profile(['Salud'],{specificNbcs:[nbc('Medicina'),nbc('Enfermería')],activities:['Ayudar a otros','Investigar']}));assert(ranked.data.slice(0,2).every(r=>['medicina','enfermeria'].includes(r.program.name)));
});
test('D: required city changes universe; preferred city permits gradual matches and IGNORE removes location points',()=>{
 const outside=[program('local','Ingeniería industrial'),program('cali','Ingeniería de sistemas',{municipality:'Cali',department:'Valle del Cauca'}),program('chia','Ingeniería de sistemas',{municipality:'Chía',department:'Bogotá D.C.'})];
 const required={...technology,refinement:{...technology.refinement,locationImportance:'REQUIRED'}};assert.equal(recommendPrograms(outside,required).eligibleCount,1);
 const soft=recommendPrograms(outside,technology);assert.equal(soft.eligibleCount,3);assert.equal(soft.data[0].program.name,'chia');
 const matches=soft.data.map(r=>r.breakdown.find(c=>c.criterion==='location').match);assert(matches.includes(.65)&&matches.includes(.2));
 const any=profile(['Tecnología'],technology.refinement,{mobility:'ANY',municipality:'',department:''});assert.equal(recommendPrograms(outside,any).eligibleCount,3);assert.equal(recommendPrograms(outside,any).data[0].breakdown.find(c=>c.criterion==='location').state,'NOT_ANSWERED');
});
test('E: a general interest alone yields preliminary results, never false 100% precision',()=>{
 const ranked=recommendPrograms(candidates,profile(['Tecnología','Negocios','Artes'],{}, {academicLevel:'',educationLevel:'',modality:'',mobility:'ANY'}));assert(ranked.data.length>0);assert(ranked.data.every(r=>r.evidence.level==='PRELIMINARY'&&r.score<100));assert.equal(ranked.data[0].score,24);
});
test('specific NBC exact, related, broad and unrelated affinities are distinct and explained',()=>{
 const scores=candidates.map(p=>academicAffinity(p,technology));assert.equal(scores[0].match,1);assert.equal(scores[2].match,.78);assert.equal(scores[1].match,.45);assert.equal(scores[3].match,0);
 assert(scores[0].detail.includes(nbc('Ingeniería de sistemas')));assert(scores[1].detail.includes('NBC es distinto'));
});
test('all selected activities count; legacy motivations deduplicate; multiple broad interests use OR at partial strength',()=>{
 const duplicate={...technology,motivations:['Resolver problemas']};assert.equal(scoreProgram(candidates[0],duplicate).score,scoreProgram(candidates[0],technology).score);
 const mixed={...technology,refinement:{...technology.refinement,activities:['Desarrollar tecnología','Enseñar'],contexts:[]}};assert(scoreProgram(candidates[0],mixed).score<scoreProgram(candidates[0],technology).score);
 const multiple=profile(['Tecnología','Negocios','Artes'],{}, {educationLevel:''});assert(recommendPrograms(candidates,multiple).data.every(r=>r.evidence.level==='PRELIMINARY'));
});
test('numeric evidence requires a specific NBC, activity/context, four criteria and at least 72 known weight',()=>{
 assert.equal(scoreProgram(candidates[0],technology).evidence.level,'SUFFICIENT');
 const noActivity={...technology,refinement:{...technology.refinement,activities:[],contexts:[]}};assert.equal(scoreProgram(candidates[0],noActivity).evidence.level,'PRELIMINARY');
 const few=profile(['Tecnología'],{specificNbcs:[nbc('Ingeniería de sistemas')],activities:['Desarrollar tecnología']},{modality:'',mobility:'ANY',educationLevel:''});assert.equal(scoreProgram(candidates[0],few).evidence.level,'PRELIMINARY');
 const missing=scoreProgram({...candidates[0],modality:'',department:''},technology);assert.equal(missing.evidence.level,'PRELIMINARY');assert(missing.missingInformation.length>0);
});
test('strict modality excludes; hybrid modality is partial; explicit unwanted NBCs and IDs are excluded',()=>{
 const strict={...technology,refinement:{...technology.refinement,modalityImportance:'REQUIRED'}};assert.equal(scoreProgram({...candidates[0],modality:'Virtual'},strict),null);
 const hybrid=scoreProgram({...candidates[0],modality:'Presencial-Virtual'},technology);assert.equal(hybrid.breakdown.find(c=>c.criterion==='modality').match,.65);
 const excluded={...technology,refinement:{...technology.refinement,excludedNbcs:[nbc('Ingeniería industrial')]}};assert(!recommendPrograms(candidates,excluded).data.some(r=>r.program.name==='industrial'));
 assert(!recommendPrograms(candidates,technology,20,['upr9-nkiz:sistemas']).data.some(r=>r.program.name==='sistemas'));
});
test('duration converts only unambiguous integer published periods; sector comes only from institution data',()=>{
 assert.equal(durationMonths('8','SEMESTRAL'),48);for(const period of ['Bimensual','Periodos','Sin definir','Por cohorte'])assert.equal(durationMonths('8',period),null);
 for(const count of ['','-1','0','3.5','9999'])assert.equal(durationMonths(count,'Semestral'),null);
 const p=profile(['Tecnología'],{...technology.refinement,duration:'MEDIUM',sector:'PUBLIC'});const scored=scoreProgram(candidates[0],p);assert.equal(scored.breakdown.find(c=>c.criterion==='duration').match,1);assert.equal(scored.breakdown.find(c=>c.criterion==='sector').match,1);
 const missing=scoreProgram({...candidates[0],periodicity:'Bimensual',institutionSector:''},p);assert.equal(missing.breakdown.find(c=>c.criterion==='duration').state,'MISSING');assert.equal(missing.breakdown.find(c=>c.criterion==='sector').state,'MISSING');assert(missing.score<scored.score);
});
test('duration range boundaries are exact only in their own range, and neighboring ranges remain partial',()=>{
 const p=profile(['Tecnología'],{...technology.refinement,duration:'LONG'});
 const fourYears=scoreProgram(program('four-years','Ingeniería de sistemas',{periodCount:'8',periodicity:'Semestral'}),p);
 const match=fourYears.breakdown.find(c=>c.criterion==='duration');assert.equal(match.state,'PARTIAL');assert(match.match>0&&match.match<1);
 const exact=scoreProgram(program('five-years','Ingeniería de sistemas',{periodCount:'10',periodicity:'Semestral'}),p);assert.equal(exact.breakdown.find(c=>c.criterion==='duration').state,'MATCH');
});
test('exceptional 100 is mathematically possible with all seven known criteria fully matched; no 99 cap',()=>{
 const p=profile(['Tecnología'],{specificNbcs:[nbc('Ingeniería de sistemas')],activities:['Desarrollar tecnología'],contexts:['Tecnología'],duration:'MEDIUM',sector:'PUBLIC',locationImportance:'REQUIRED',modalityImportance:'REQUIRED'});assert.equal(scoreProgram(candidates[0],p).score,100);assert.equal(scoreProgram(candidates[0],p).evidence.exactMatches,7);
});
test('whole earned points never round a partial 99.6 match up to 100',()=>{
 const p=profile(['Negocios'],{specificNbcs:[nbc('Contaduría')],activities:['Trabajar con números'],contexts:['Datos'],duration:'MEDIUM',sector:'PUBLIC',locationImportance:'REQUIRED',modalityImportance:'REQUIRED'});
 const r=scoreProgram(program('partial','Contaduría'),p);assert(r.rankingValue>=99.5&&r.rankingValue<100);assert.equal(r.score,Math.floor(r.rankingValue));assert.equal(r.evidence.exactMatches,6);
});
test('validation rejects unknown, duplicated and contradictory NBCs and priorities',()=>{
 assert(validRefinement(emptyRefinement));for(const change of [{specificNbcs:['Inventado']},{activities:['toString']},{locationImportance:'forever'},{specificNbcs:[nbc('Medicina'),nbc('Medicina')]},{specificNbcs:[nbc('Medicina')],excludedNbcs:[nbc('Medicina')]}])assert.equal(validRefinement({...emptyRefinement,...change}),false);
});
test('sorting is stable and preserves detailed scores/explanations for equal rounded values',()=>{
 assert.deepEqual(recommendPrograms(candidates,technology),recommendPrograms(candidates.toReversed(),technology));const r=scoreProgram(candidates[0],technology);assert.equal(r.score,Math.floor(r.breakdown.reduce((sum,c)=>sum+(c.match||0)*c.weight,0)+Number.EPSILON*100));assert(r.reasons.every(reason=>typeof reason==='string'));assert.equal(r.provenance.algorithmVersion,'matching-v2.0');
});
