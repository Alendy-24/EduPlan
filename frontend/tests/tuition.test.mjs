import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTuition, tuitionChartRows } from '../src/utils/tuition.js';
const tuition = { amount:4500000,currency:'COP',basis:'NEW_STUDENT_REPORTED',source:'https://hecaa.mineducacion.gov.co/consultaspublicas/programas',sourceField:'COSTO_MATRÍCULA_ESTUD_NUEVOS',importedAt:'2026-10-07' };
const program = { provenance:'real',comparisonState:'current',tuition };
test('only current official values appear in the comparison graph', () => {
  const rows = tuitionChartRows([program,{...program,tuition:{...tuition,amount:9000000}},{...program,comparisonState:'error'},{...program,provenance:'demo'}]);
  assert.equal(rows[0].width,50);assert.equal(rows[1].width,100);
  assert.equal(rows[2].tuition,undefined);assert.equal(rows[3].tuition,undefined);
});
test('missing and invalid amounts cannot become zero, zero is preserved if reported', () => {
  assert.equal(normalizeTuition({...tuition,amount:null}),undefined);
  assert.equal(normalizeTuition({...tuition,amount:-1}),undefined);
  assert.equal(normalizeTuition({...tuition,source:'javascript:alert(1)'}),undefined);
  const rows = tuitionChartRows([{...program,tuition:{...tuition,amount:0}}]);
  assert.equal(rows[0].tuition.amount,0);assert.equal(rows[0].width,0);
});
