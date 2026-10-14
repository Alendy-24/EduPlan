import test from 'node:test';
import assert from 'node:assert/strict';
import { createTuitionResolver, resolveTuition } from '../dist/services/snies-tuition.js';
const context = { sniesCode:'1', institutionCode:'1101', modality:'Presencial', municipality:'Bogotá, D.C.' };
const index = { schemaVersion:1, source:'https://hecaa.mineducacion.gov.co/consultaspublicas/programas', field:'COSTO_MATRÍCULA_ESTUD_NUEVOS', importedAt:'2026-10-07', records:[['1','1101','Presencial','Bogotá D.C.',4500000]] };
test('tuition joins the exact program, institution, modality and location', () => {
  const resolve = createTuitionResolver(index);
  assert.equal(resolve(context).amount,4500000);
  assert.equal(resolve(context).priceYear,null);
  for (const changes of [{sniesCode:'2'},{institutionCode:'1102'},{modality:'Virtual'},{municipality:'Medellín'},{sniesCode:undefined}]) assert.equal(resolve({...context,...changes}),undefined);
});
test('conflicting reported values are not selected arbitrarily, explicit zero is retained', () => {
  assert.equal(createTuitionResolver({...index,records:[...index.records,['1','1101','Presencial','Bogotá D.C.',6000000]]})(context),undefined);
  assert.equal(createTuitionResolver({...index,records:[['1','1101','Presencial','Bogotá D.C.',0]]})(context).amount,0);
});
test('imported official records expose provenance without inventing a validity year', () => {
  const result = resolveTuition({sniesCode:'19',institutionCode:'1101',modality:'Presencial',municipality:'Bogotá D.C.'});
  assert.equal(result,undefined); // The export has no price for this offer.
  const known = resolveTuition({...context,sniesCode:'100'});
  assert.equal(known.amount,9760315);
  assert.equal(known.sourceField,'COSTO_MATRÍCULA_ESTUD_NUEVOS');
  assert.equal(known.priceYear,null);
});
