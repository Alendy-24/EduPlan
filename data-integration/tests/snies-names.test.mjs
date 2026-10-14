import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSniesResolver, suggestProgramNames } from '../dist/services/snies-names.js';
import { transformProgram, getPrograms } from '../dist/services/programs.service.js';
import { clearProgramCatalogCache } from '../dist/services/program-catalog.js';
import { clearInstitutionCatalogCache } from '../dist/services/institutions.service.js';
const index = JSON.parse(readFileSync(new URL('../data/snies-program-names.json', import.meta.url), 'utf8'));
test('explicit active status disambiguates historical codes but never replaces an inactive or unknown selection',()=>{
  const old=['1','1702','NOMBRE ANTIGUO','TITULO','Pregrado','Presencial','Santiago de Cali'];
  const current=['2','1702','NOMBRE VIGENTE','TITULO','Pregrado','Presencial','Santiago de Cali'];
  const resolve=createSniesResolver({schemaVersion:2,source:'official',field:'NOMBRE_DEL_PROGRAMA',importedAt:'2026-10-14',records:[old,current],activeRecords:[current]});
  const context={institutionCode:'1702',awardedTitle:'TITULO',academicLevel:'Pregrado',modality:'Presencial',municipality:'Cali'};
  assert.equal(resolve({...context,status:'Activo'}).sniesCode,'2');
  assert.equal(resolve(context),null);assert.equal(resolve({...context,status:'Inactivo'}),null);
  assert.equal(resolve({...context,status:'Activo',municipality:'Palmira'}),null);
});
test('same program name at different campuses resolves the local SNIES code and tuition', async () => {
  const { createTuitionResolver } = await import('../dist/services/snies-tuition.js');
  const resolve = createSniesResolver({schemaVersion:2,source:'official',field:'NOMBRE_DEL_PROGRAMA',importedAt:'2026-10-14',records:[
    ['1','1701','INGENIERIA DE SISTEMAS','INGENIERO DE SISTEMAS','Pregrado','Presencial','Bogotá, D.C.'],
    ['2','1701','INGENIERIA DE SISTEMAS','INGENIERO DE SISTEMAS','Pregrado','Presencial','Cali'],
  ]});
  const context = {institutionCode:'1701',awardedTitle:'INGENIERO DE SISTEMAS',academicLevel:'Pregrado',modality:'Presencial',municipality:'Cali'};
  assert.equal(resolve(context).sniesCode, '2');
  assert.equal(resolve({...context,municipality:''}).sniesCode, '');
  const tuition = createTuitionResolver({schemaVersion:1,source:'official',field:'COSTO_MATRÍCULA_ESTUD_NUEVOS',importedAt:'2026-10-14',records:[
    ['1','1701','Presencial','Bogotá, D.C.',1000000],['2','1701','Presencial','Cali',2000000],
  ]});
  assert.equal(tuition({...context,sniesCode:resolve(context).sniesCode}).amount,2000000);
  assert.equal(tuition({...context,municipality:'Medellín',sniesCode:resolve(context).sniesCode}),undefined);
});
const sourceRow = (code, identity) => {
  const record = index.records.find(row => row[1] === code);
  return {source_row_id:identity,codigoprograma:'unknown',codigoinstitucion:code,
    nombretituloobtenido:record[3],nombrenivelacademico:record[4],
    nombremetodologia:record[5],nombremunicipioprograma:record[6]};
};
test('official SNIES name is independent from the awarded title and raw location', () => {
  const [code, institutionCode, name] = index.records.find(row => row[1] === '1701' && row[2] === 'INGENIERIA DE SISTEMAS');
  const value = transformProgram({ source_row_id: 'identity', codigoprograma: '11', codigoinstitucion: institutionCode, nombreprograma: 'Bogotá D.C.', nombretituloobtenido: 'INGENIERO DE SISTEMAS', nombrenivelacademico:'Pregrado', nombremetodologia:'Presencial', nombremunicipioprograma:'Bogotá D.C.' });
  assert.equal(value.name, name); assert.equal(value.awardedTitle, 'INGENIERO DE SISTEMAS'); assert.notEqual(value.name, value.awardedTitle);
  assert.equal(value.nameOrigin, 'SNIES_NAME'); assert.equal(value.nameSourceField, 'NOMBRE_DEL_PROGRAMA');
  assert.equal(value.code, '11'); assert.equal(value.sniesCode, code);
});
test('context matching never guesses from titles, misleading codes, gender variants or ambiguous official names', () => {
  const resolve = createSniesResolver({schemaVersion:2,source:'official',field:'NOMBRE_DEL_PROGRAMA',importedAt:'2026-09-30',records:[
    ['3079','1701','INGENIERIA DE SISTEMAS','INGENIERO DE SISTEMAS','Pregrado','Presencial','Bogotá, D.C.'],
    ['99','1701','OTRO NOMBRE OFICIAL','INGENIERO DE SISTEMAS','Pregrado','Presencial','Cali'],
  ]});
  const context={institutionCode:'1701',awardedTitle:'INGENIERO DE SISTEMAS',academicLevel:'Pregrado',modality:'Presencial',municipality:'Bogotá D.C.'};
  assert.equal(resolve(context).name,'INGENIERIA DE SISTEMAS'); assert.equal(resolve({...context,municipality:''}),null);
  assert.equal(resolve({...context,institutionCode:'1702'}),null);assert.equal(resolve({...context,awardedTitle:'INGENIERO(A) DE SISTEMAS'}),null);
  assert.equal(resolve({...context,modality:'Virtual'}),null);assert.equal(resolve({...context,academicLevel:'Posgrado'}),null);
  const unknown=transformProgram({source_row_id:'wrong-code',codigoprograma:'3079',codigoinstitucion:'1701',nombretituloobtenido:'OTRO TITULO',nombrenivelacademico:'Pregrado',nombremetodologia:'Presencial'});
  assert.equal(unknown.name,'Nombre del programa no disponible');
});
test('Javeriana campuses use exact official institution codes and one shared catalog request', async t => {
  clearInstitutionCatalogCache(); clearProgramCatalogCache(); let institutionalRequests = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.pathname.includes('n5yy-8nav')) { institutionalRequests++; return Response.json([
      { c_digo_instituci_n: '1701', nombre_instituci_n: 'PONTIFICIA UNIVERSIDAD JAVERIANA', municipio_domicilio: 'Bogotá D.C.', principal_seccional: 'Principal', p_gina_web: 'www.javeriana.edu.co' },
      { c_digo_instituci_n: '1702', nombre_instituci_n: 'PONTIFICIA UNIVERSIDAD JAVERIANA', municipio_domicilio: 'Cali', departamento_domicilio: 'Valle del Cauca', principal_seccional: 'Seccional', p_gina_web: 'www.puj.edu.co' },
    ]); }
    return Response.json(['1701','1702'].map((code, i) => sourceRow(code, 'campus-' + i)));
  });
  const [first, second] = await Promise.all([getPrograms({ page: 1, limit: 1 }), getPrograms({ page: 2, limit: 1 })]);
  assert.equal(first[0].institutionWebsite, 'www.javeriana.edu.co'); assert.equal(first[0].institutionMunicipality, 'Bogotá D.C.'); assert.equal(first[0].institutionCampus, 'Principal');
  assert.equal(second[0].institutionWebsite, 'www.puj.edu.co'); assert.equal(second[0].institutionMunicipality, 'Cali'); assert.equal(second[0].institutionCampus, 'Seccional'); assert.equal(institutionalRequests, 1);
  clearInstitutionCatalogCache();
});
test('institution outage leaves programs usable and retries without a cached failure', async t => {
  clearInstitutionCatalogCache(); clearProgramCatalogCache(); let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.pathname.includes('n5yy-8nav')) { calls++; throw Error('offline'); }
    return Response.json([sourceRow('1701','offline')]);
  });
  assert.equal((await getPrograms({ page: 1, limit: 12 }))[0].institutionEnrichmentUnavailable, true);
  assert.equal((await getPrograms({ page: 1, limit: 12 }))[0].institutionWebsite, undefined); assert.equal(calls, 2);
  clearInstitutionCatalogCache();
});

test('career suggestions are bounded official names, accent insensitive and filtered by level and university', () => {
  const names = suggestProgramNames('ingenieria de sistemas',{academicLevel:'Pregrado',institutionCode:'1701'});
  assert(names.includes('INGENIERIA DE SISTEMAS'));
  assert(names.length <= 8);
  const normalized = value => value.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase();
  assert.equal(new Set(names.map(normalized)).size,names.length);
  assert.deepEqual(names,suggestProgramNames('Ingeniería de Sistemas',{academicLevel:'Pregrado',institutionCode:'1701'}));
  assert.deepEqual(suggestProgramNames('i'),[]);
  assert.deepEqual(suggestProgramNames('de'),[]);
  assert.deepEqual(suggestProgramNames('sistemas',{institutionCode:'000000'}),[]);
  assert(names.every(name => index.records.some(row => row[2]===name && row[1]==='1701' && row[4]==='Pregrado')));
});

test('correct medicine suggestions do not reinterpret the query as measurement or business words', () => {
  const names=suggestProgramNames('medicina',{academicLevel:'Posgrado'});
  assert(names.length>0);
  assert(names.every(name => /MEDICINA/.test(name.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase())));
});

test('official suggestions tolerate common spelling mistakes', () => {
  for (const query of ['sicologia','psciologia']) assert(suggestProgramNames(query).some(name => name.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase()==='PSICOLOGIA'));
  assert(suggestProgramNames('ingeneria de sitemas').some(name => /INGENIER[IÍ]A DE SISTEMAS$/.test(name)));
});

test('suggestions remain available from a two-letter final specialty fragment', () => {
  for(const query of ['ingenieria de si','ingenieria de sis']) assert(suggestProgramNames(query).some(name => /INGENIER[IÍ]A DE SISTEMAS$/.test(name)),query);
});

test('literal complete alternative titles resolve without generating gender or subject variants',()=>{
 const r=['1','2812','ADMINISTRACION DE EMPRESAS','Administrador de Empresas / Administradora de Empresas / Administradore de Empresas','Pregrado','Presencial','Bogotá, D.C.'];
 const context={institutionCode:'2812',awardedTitle:'ADMINISTRADOR DE EMPRESAS',academicLevel:'Pregrado',modality:'Presencial',municipality:'Bogotá, D.C.',status:'Activo'};
 const resolve=createSniesResolver({schemaVersion:2,records:[r],activeRecords:[r]});
 assert.equal(resolve(context).sniesCode,'1');
 assert.equal(resolve({...context,awardedTitle:'ADMINISTRADOR EMPRESARIAL'}),null);
 assert.equal(resolve({...context,municipality:'Medellín'}),null);
 const partial={schemaVersion:2,records:[['2','2812','LENGUAS','Licenciado en Español / Inglés','Pregrado','Presencial','Bogotá, D.C.']]};
 assert.equal(createSniesResolver(partial)({...context,status:'',awardedTitle:'Inglés'}),null);
 assert.equal(createSniesResolver({...partial,records:[['2','2812','INGENIERIA','Ingeniero/a','Pregrado','Presencial','Bogotá, D.C.']]})({...context,status:'',awardedTitle:'Ingeniero'}),null);
});

test('active codes require complete exact official credit, duration, formation and periodicity evidence',()=>{
 const a=['1','1701','PROGRAMA A','TITULO','Pregrado','Presencial','Bogotá, D.C.'];
 const b=['2','1701','PROGRAMA B','TITULO','Pregrado','Presencial','Bogotá, D.C.'];
 const details=[['1','1701','Presencial','Bogotá, D.C.','Universitario','160.0','10.0','Semestral'],['2','1701','Presencial','Bogotá, D.C.','Universitario','150.0','9.0','Semestral']];
 const data={schemaVersion:2,records:[a,b],activeRecords:[a,b],activeDetails:details};
 const context={institutionCode:'1701',awardedTitle:'TITULO',academicLevel:'Pregrado',modality:'Presencial',municipality:'Bogotá D.C.',status:'Activo',educationLevel:'Universitaria',credits:'160',periodCount:'10',periodicity:'Semestral'};
 const resolve=createSniesResolver(data);
 assert.equal(resolve(context).sniesCode,'1');
 for(const change of [{credits:''},{periodCount:''},{periodicity:''},{educationLevel:''},{credits:'161'},{credits:'160.5'},{periodCount:'9'},{periodicity:'Anual'},{educationLevel:'Tecnológica'},{status:'Inactivo'},{municipality:'Cali'},{modality:'Virtual'},{awardedTitle:'OTRO TITULO'}])assert.equal(resolve({...context,...change}),null);
 for(const activeDetails of [details.slice(0,1),[details[0],[...details[1].slice(0,5),'',...details[1].slice(6)]],[...details,[...details[1].slice(0,5),'160','10','Semestral']]])assert.equal(createSniesResolver({...data,activeDetails})(context),null);
 assert.equal(createSniesResolver({...data,activeDetails:undefined})(context),null);
 assert.equal(createSniesResolver({...data,activeDetails:[details[0],['2','1701','Presencial','Bogotá, D.C.','Universitario','160','10','Semestral']]})(context),null);
});

test('unmatched additional metadata does not erase an already verified shared name',()=>{
 const a=['1','1701','NOMBRE OFICIAL','TITULO','Pregrado','Presencial','Bogotá, D.C.'];
 const b=['2',...a.slice(1)];
 const resolve=createSniesResolver({schemaVersion:2,records:[a,b],activeRecords:[a,b],activeDetails:[['1','1701','Presencial','Bogotá, D.C.','Universitario','160','10','Semestral'],['2','1701','Presencial','Bogotá, D.C.','Universitario','150','9','Semestral']]});
 const result=resolve({institutionCode:'1701',awardedTitle:'TITULO',academicLevel:'Pregrado',modality:'Presencial',municipality:'Bogotá, D.C.',status:'Activo',educationLevel:'Universitaria',credits:'140',periodCount:'8',periodicity:'Semestral'});
 assert.equal(result.name,'NOMBRE OFICIAL');assert.equal(result.sniesCode,'');
});
