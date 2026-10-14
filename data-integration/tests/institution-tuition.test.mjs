import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInstitutionTuitionResolver, resolveInstitutionTuition } from '../dist/services/institution-tuition.js';
import { transformProgram } from '../dist/services/programs.service.js';
const catalog = JSON.parse(readFileSync(new URL('../data/institution-tuition.json',import.meta.url)));
const names = JSON.parse(readFileSync(new URL('../data/snies-program-names.json',import.meta.url)));
const record = catalog.records.find(r=>r.sniesCode==='1112');
const context = {sniesCode:record.sniesCode,institutionCode:record.institutionCode,modality:record.modality,municipality:record.municipality};
test('reviewed price matches only its exact offer and year', () => {
  const resolve = createInstitutionTuitionResolver({schemaVersion:1,records:[record]});
  assert.equal(resolve(context,2026).amount,16733000);
  assert.equal(resolve(context,2027),undefined);
  for(const changes of [{sniesCode:'1113'},{institutionCode:'1701'},{modality:'Virtual'},{municipality:'Cali'},{sniesCode:undefined}]) assert.equal(resolve({...context,...changes},2026),undefined);
  const value=resolve(context,2026);
  assert.equal(value.priceYear,2026);assert.equal(value.billingPeriod,'SEMESTER');assert.equal(value.basis,'INSTITUTION_PUBLISHED');
});
test('conflicting prices and invalid source data are never selected', () => {
  assert.equal(createInstitutionTuitionResolver({schemaVersion:1,records:[record,{...record,amount:100}]})(context,2026),undefined);
  for(const changes of [{source:'https://example.com/fees'},{amount:-1},{amount:null},{billingPeriod:'CREDIT'},{note:''}]) assert.throws(()=>createInstitutionTuitionResolver({schemaVersion:1,records:[{...record,...changes}]}));
});
test('every initial price belongs to a unique official offer and keeps provenance', () => {
  const resolve=createInstitutionTuitionResolver(catalog);
  for(const r of catalog.records) {
    assert.equal(names.records.filter(n=>n[0]===r.sniesCode&&n[1]===r.institutionCode&&n[5]===r.modality&&n[6]===r.municipality).length,1);
    const result=resolve(r,2026);
    assert.equal(result.source,r.source);assert.equal(result.amount,r.amount);assert.equal(result.note,r.note);
  }
});
test('program API prioritizes current institutional prices', () => {
  for(const code of ['1112','7777','106109']) {
    const n=names.records.find(r=>r[0]===code);
    const result=transformProgram({source_row_id:code,codigoinstitucion:n[1],nombretituloobtenido:n[3],nombrenivelacademico:n[4],nombremetodologia:n[5],nombremunicipioprograma:n[6]});
    const expected=resolveInstitutionTuition({sniesCode:n[0],institutionCode:n[1],modality:n[5],municipality:n[6]});
    if(expected) {assert.equal(result.tuition.basis,'INSTITUTION_PUBLISHED');assert.equal(result.tuition.amount,expected.amount);}
    else assert.notEqual(result.tuition?.basis,'INSTITUTION_PUBLISHED');
  }
});
test('ambiguous academic identities cannot inherit a price even if it exists in the reviewed catalog', () => {
  const n=names.records.find(r=>r[0]==='103211');
  const result=transformProgram({source_row_id:n[0],codigoinstitucion:n[1],nombretituloobtenido:n[3],nombrenivelacademico:n[4],nombremetodologia:n[5],nombremunicipioprograma:n[6]});
  assert.equal(result.sniesCode,undefined);
  assert.equal(result.tuition,undefined);
});
