import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  const data=JSON.parse(readFileSync(new URL('../data/snies-tuition.json',import.meta.url)));
  // Official snapshots change during scheduled refreshes; fixed-value matching
  // and missing-value behavior are tested with independent fixtures above.
  const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const groups=new Map();
  for(const r of data.records){const key=JSON.stringify([r[0],r[1],fold(r[2]),fold(r[3])]);const values=groups.get(key)||[];values.push(r);groups.set(key,values);}
  const r=[...groups.values()].find(rows=>rows.length===1)[0];
  const known = resolveTuition({sniesCode:r[0],institutionCode:r[1],modality:r[2],municipality:r[3]});
  assert.equal(known.amount,r[4]);
  assert.equal(known.importedAt,data.importedAt);
  assert.equal(known.sourceField,'COSTO_MATRÍCULA_ESTUD_NUEVOS');
  assert.equal(known.priceYear,null);
});
