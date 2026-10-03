import { facetCount, offerIsSelected, selectedModalities, institutionSectorLabel } from '../src/utils/program-search.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProgram, normalizeProgramPage, mergePrograms, programHref, programSearchMatches, validStoredProgram, comparisonSnapshot } from '../src/utils/programs.js';
import { getPrograms, getProgramsByCode, getProgramSuggestions, getProgramFilterOptions } from '../src/services/programs.js';
const row = n => ({ sourceId: `upr9-nkiz:row-${n}`, code: '11', name: `Programa ${n}`, rawName: `Programa ${n}`, institutionName: 'Institución', municipality: 'Bogotá', academicLevel: 'Pregrado', modality: 'Presencial' });
test('A: twelve source rows, including two unspecified codes, remain usable', () => {
  const data = Array.from({ length: 12 }, (_, n) => ({ ...row(n), code: n >= 10 ? 'No especifica' : '11' }));
  const result = normalizeProgramPage({ data });
  assert.equal(result.programs.length, 12); assert.equal(result.receivedCount, 12); assert.equal(result.unusableCount, 0);
});
test('B/C: opaque codes survive links, pagination and persisted comparison by sourceId', () => {
  const a = normalizeProgram({ ...row(0), code: 'No especifica' }), b = normalizeProgram({ ...row(1), code: 'No especifica' });
  assert.equal(a.code, 'No especifica'); assert.match(programHref(a), /No%20especifica\?registro=upr9-nkiz%3Arow-0$/);
  assert.equal(mergePrograms([a], [a, b]).length, 2); assert(validStoredProgram(comparisonSnapshot(a)));
  assert.equal(normalizeProgram({ ...row(2), code: 'ABC/12' }).code, 'ABC/12');
});
test('D: civil remains explainable through raw name or published knowledge area', () => {
  const program = normalizeProgram({ ...row(0), name: 'Doctor en Ingeniería', rawName: 'Doctorado en Ingeniería Civil', awardedTitle: 'Doctor en Ingeniería', nameOrigin: 'AWARDED_TITLE', reviewRequired: true });
  assert.deepEqual(programSearchMatches(program, 'civil'), [{ key: 'rawName', label: 'Nombre publicado (sin verificar)', value: 'Doctorado en Ingeniería Civil' }]);
  const realPattern = normalizeProgram({ ...program, institutionName: 'Institución', knowledgeArea: 'Ingeniería civil y afines', rawName: 'Bogotá D.C.' });
  assert.equal(programSearchMatches(realPattern, 'civil')[0].key, 'area');
});
test('search preserves API relevance and explains engineering title variants without inventing a name', () => {
  const program = normalizeProgram({ ...row(0), name: 'INGENIERO(A) DE SISTEMAS', rawName: 'Bogotá', awardedTitle: 'INGENIERO(A) DE SISTEMAS', nameOrigin: 'AWARDED_TITLE', reviewRequired: true, searchMatch: 'SIMILAR_NAME_OR_TITLE' });
  assert.equal(program.searchMatch, 'SIMILAR_NAME_OR_TITLE');
  assert.equal(program.name, 'Nombre del programa no disponible');
  assert.deepEqual(programSearchMatches(program, 'Ingeniería de Sistemas'), [{ key: 'awardedTitle', label: 'Título otorgado', value: program.awardedTitle }]);
  assert.equal(normalizeProgram({ ...row(1), searchMatch: 'KNOWLEDGE_AREA' }).searchMatch, 'KNOWLEDGE_AREA');
});
test('F: corrupt rows are reported individually; absent optional fields remain displayable', () => {
  const result = normalizeProgramPage({ data: [row(0), { ...row(1), sourceId: null }, { ...row(2), municipality: null, modality: { invalid: true }, code: '' }] });
  assert.equal(result.programs.length, 2); assert.equal(result.unusableCount, 1); assert.equal(result.incompleteCount, 1);
  assert.equal(result.programs[1].city, 'No disponible'); assert.equal(programHref(result.programs[1]), null);
  assert.throws(() => normalizeProgramPage({ data: {} }), /Respuesta de programas no válida/);
  assert.throws(() => normalizeProgramPage({ data: [null] }), /1 registros recibidos/);
  assert.equal(normalizeProgramPage({ data: [] }).receivedCount, 0);
});
test('service preserves raw page size and encodes opaque codes without coercion', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /No%20especifica$/);
    return Response.json({ data: [{ ...row(0), code: 'No especifica' }] });
  });
  assert.equal((await getProgramsByCode('No especifica')).programs[0].code, 'No especifica');
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: [row(0), null] }));
  const page = await getPrograms({}, 1);
  assert.equal(page.receivedCount, 2); assert.equal(page.programs.length, 1);
});

test('service distinguishes empty catalog, structural payload errors and network failure', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: [] }));
  assert.equal((await getPrograms({}, 1)).programs.length, 0); t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>not the API</html>'));
  await assert.rejects(getPrograms({}, 1), /Respuesta de programas no válida/); t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  await assert.rejects(getPrograms({}, 1), /No se pudo conectar al catálogo/);
});

test('search explanations recognize expanded career names and different connectors', () => {
  const program = {name:'Ingeniería en Sistemas y Computación', nameOrigin:'SNIES_NAME', awardedTitle:'', area:''};
  assert.deepEqual(programSearchMatches(program,'ingenieria de sistemas').map(match => match.key), ['name']);
  assert.deepEqual(programSearchMatches({...program,name:'Administración de Empresas'},'Administración y Dirección de Empresas').map(match => match.key), ['name']);
  assert.deepEqual(programSearchMatches({...program,name:'Ingeniería Civil'},'Ingeniería de Sistemas'), []);
});

test('career suggestion requests preserve filters and reject malformed names', async t => {
  t.mock.method(globalThis,'fetch',async url => {
    const params = new URL(url,'http://localhost').searchParams;
    assert.equal(params.get('q'),'Ingeniería');
    assert.equal(params.get('academicLevel'),'Pregrado');
    assert.equal(params.get('institutionCode'),'1701');
    return Response.json({data:['Ingeniería de Sistemas']});
  });
  assert.deepEqual(await getProgramSuggestions('Ingeniería',{academicLevel:'Pregrado',institutionCode:'1701'}),['Ingeniería de Sistemas']);
  t.mock.restoreAll();
  t.mock.method(globalThis,'fetch',async ()=>Response.json({data:[null]}));
  await assert.rejects(getProgramSuggestions('sistemas',{}),/Sugerencias no válidas/);
});

test('page metadata preserves whole-catalog counts, exact pagination and valid alternatives', () => {
  const facets=Object.fromEntries(['academicLevel','modality','knowledgeArea','institutionCode','department','municipality'].map(key=>[key,[]]));
  const result=normalizeProgramPage({data:[row(0)],total:1,hasMore:false,facets,alternatives:[{remove:['modality'],count:2},{remove:['name'],count:3}]});
  assert.equal(result.total,1); assert.equal(result.hasMore,false);
  assert.deepEqual(result.alternatives,[{remove:['modality'],count:2}]);
  assert.throws(()=>normalizeProgramPage({data:[],total:-1}),/Conteo/);
  assert.throws(()=>normalizeProgramPage({data:[],facets:{...facets,modality:[null]}}),/Cantidades/);
});

test('grouped comparisons preserve identity across detail records and geographic counts use city aliases', () => {
  const a={id:'upr9-nkiz:a',sourceId:'upr9-nkiz:a',offerId:'offer:same',name:'Psicología',provenance:'real',code:'11'};
  const b={...a,id:'upr9-nkiz:b',sourceId:'upr9-nkiz:b'};
  assert(offerIsSelected(a,b));
  assert.equal(mergePrograms([a],[b]).length,2);
  assert.equal(comparisonSnapshot(a).offerId,a.offerId);
  assert(validStoredProgram(comparisonSnapshot(a)));
  assert.equal(offerIsSelected(a,{...b,offerId:'offer:other'}),false);
  assert.equal(facetCount({municipality:[{value:'Cali',count:8}]},'municipality','Santiago de Cali'),8);
  assert.equal(facetCount({department:[{value:'Bogotá D.C.',count:4}]},'department','Bogotá, D.C.'),4);
  assert.equal(facetCount(undefined,'modality','Virtual'),undefined);
});


test('multiple program modalities are serialized individually and URL selections stay unique',async t=>{
  assert.deepEqual(selectedModalities(new URLSearchParams('modality=Virtual&modality=Presencial&modality=Virtual&modality=')),['Virtual','Presencial']);
  assert.equal(institutionSectorLabel('OFICIAL'),'Pública');
  assert.equal(institutionSectorLabel('Privada'),'Privada');
  t.mock.method(globalThis,'fetch',async url=>{
    const params=new URL(url,'http://localhost').searchParams;
    assert.deepEqual(params.getAll('modality'),['Presencial','Virtual']);
    assert.equal(params.get('institutionSector'),'Oficial');
    assert.equal(params.get('educationLevel'),'Tecnológica');
    return Response.json({data:[]});
  });
  await getPrograms({modality:['Presencial','Virtual'],institutionSector:'Oficial',educationLevel:'Tecnológica'},1);
});

test('new formation and sector options validate their data while old filter responses remain usable',async t=>{
  const data={academicLevels:['Pregrado'],knowledgeAreas:[],modalities:['Presencial'],institutions:[]};
  t.mock.method(globalThis,'fetch',async()=>Response.json({data}));
  assert.deepEqual((await getProgramFilterOptions()).educationLevels,[]);
  data.educationLevels=['Tecnológica'];data.institutionSectors=['Oficial','Privada'];
  assert.deepEqual((await getProgramFilterOptions()).institutionSectors,['Oficial','Privada']);
  data.institutionSectors=[{bad:true}];
  await assert.rejects(getProgramFilterOptions(),/filtros del catálogo no son válidos/);
});
