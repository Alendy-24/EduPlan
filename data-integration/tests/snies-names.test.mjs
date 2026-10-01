import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSniesResolver } from '../dist/services/snies-names.js';
import { transformProgram, getPrograms } from '../dist/services/programs.service.js';
import { clearInstitutionCatalogCache } from '../dist/services/institutions.service.js';
const index = JSON.parse(readFileSync(new URL('../data/snies-program-names.json', import.meta.url), 'utf8'));
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
  clearInstitutionCatalogCache(); let institutionalRequests = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.pathname.includes('n5yy-8nav')) { institutionalRequests++; return Response.json([
      { c_digo_instituci_n: '1701', nombre_instituci_n: 'PONTIFICIA UNIVERSIDAD JAVERIANA', municipio_domicilio: 'Bogotá D.C.', principal_seccional: 'Principal', p_gina_web: 'www.javeriana.edu.co' },
      { c_digo_instituci_n: '1702', nombre_instituci_n: 'PONTIFICIA UNIVERSIDAD JAVERIANA', municipio_domicilio: 'Cali', departamento_domicilio: 'Valle del Cauca', principal_seccional: 'Seccional', p_gina_web: 'www.puj.edu.co' },
    ]); }
    return Response.json(['1701','1702'].map((code, i) => ({ source_row_id: 'campus-' + i, codigoprograma: 'unknown', codigoinstitucion: code, nombreprograma: 'Bogotá D.C.', nombretituloobtenido: 'INGENIERO' })));
  });
  const [first, second] = await Promise.all([getPrograms({ page: 1, limit: 12 }), getPrograms({ page: 2, limit: 12 })]);
  assert.equal(first[0].institutionWebsite, 'www.javeriana.edu.co'); assert.equal(first[0].institutionMunicipality, 'Bogotá D.C.'); assert.equal(first[0].institutionCampus, 'Principal');
  assert.equal(second[1].institutionWebsite, 'www.puj.edu.co'); assert.equal(second[1].institutionMunicipality, 'Cali'); assert.equal(second[1].institutionCampus, 'Seccional'); assert.equal(institutionalRequests, 1);
  clearInstitutionCatalogCache();
});
test('institution outage leaves programs usable and retries without a cached failure', async t => {
  clearInstitutionCatalogCache(); let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.pathname.includes('n5yy-8nav')) { calls++; throw Error('offline'); }
    return Response.json([{ source_row_id: 'offline', codigoprograma: 'unknown', codigoinstitucion: '1701', nombretituloobtenido: 'INGENIERO' }]);
  });
  assert.equal((await getPrograms({ page: 1, limit: 12 }))[0].institutionEnrichmentUnavailable, true);
  assert.equal((await getPrograms({ page: 1, limit: 12 }))[0].institutionWebsite, undefined); assert.equal(calls, 2);
  clearInstitutionCatalogCache();
});
