import test from 'node:test';import assert from 'node:assert/strict';
import {extractEanTuition,EAN_SOURCE} from '../tools/ean-tuition.mjs';
const names=[['1983','2812','ADMINISTRACION DE EMPRESAS','','Pregrado','Presencial','Bogotá, D.C.']];
const fixture=(row,year=2026)=>Array.from({length:4},(_,i)=>`<table><tr><th>Programa</th><th>Modalidad</th><th>SNIES</th><th>Valor crédito ${year}</th><th>Créditos 1.er semestre</th><th>Valor matrícula 1.er semestre ${year}*</th></tr>${i===0?row:''}</table>`).join('');
const row=(code='1983',mode='Presencial',credits='18',total='$ 10.260.000')=>`<tr><td>Administración de Empresas</td><td>${mode}</td><td>${code}</td><td>$ 570.000</td><td>${credits}</td><td>${total}</td></tr>`;
const extract=(html,n=names)=>extractEanTuition(html,EAN_SOURCE,n,'2026-10-14');
test('EAN takes the explicit first semester total rather than credit price or a calculation',()=>{const r=extract(fixture(row()));assert.equal(r.records.length,1);assert.equal(r.records[0].amount,10260000);assert.equal(r.records[0].billingPeriod,'FIRST_ENROLLMENT');});
test('EAN rejects missing SNIES, year-based doctorates, decimal fees and wrong modalities',()=>{
 for(const args of [['Res. 2026'],['1983','Virtual'],['1983','Presencial','24 - 1.er año'],['1983','Presencial','18','$ 10.260.000,50']])assert.equal(extract(fixture(row(...args))).records.length,0);
 assert.throws(()=>extract(fixture(row(),2025)));
});
test('EAN does not spread a code across cities and institutions',()=>{const h=fixture(row());assert.equal(extract(h,[...names,['1983','2812','ADMINISTRACION DE EMPRESAS','','Pregrado','Presencial','Medellín']]).records.length,0);assert.equal(extract(h,[['1983','1806','ADMINISTRACION DE EMPRESAS','','Pregrado','Presencial','Bogotá, D.C.']]).records.length,0);});
