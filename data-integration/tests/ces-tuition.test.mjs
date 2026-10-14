import test from 'node:test';import assert from 'node:assert/strict';
import {extractCesTuition,CES_SOURCE} from '../tools/ces-tuition.mjs';
const names=[['1','2708','MEDICINA','','Pregrado','Presencial','Medellín']];
const row=(name='Pregrado en Medicina',value='COP 25.300.000')=>`<tr><td>${name}</td><td>${value}</td></tr>`;
const section=(rows,year=2026)=>`<div class="accordion-item"><h2 class="accordion-header">Derechos de matrícula ${year}</h2><table><tbody>${rows}</tbody></table></div>`;
const extract=(html,n=names)=>extractCesTuition(html,CES_SOURCE,n,'2026-10-14');
test('CES accepts only fixed tuition in the current tuition section',()=>{const r=extract(section(row())+'<table><tbody>'+row('Pregrado en Medicina','COP 236.800')+'</tbody></table>');assert.equal(r.records.length,1);assert.equal(r.records[0].amount,25300000);assert.equal(r.records[0].billingPeriod,'ACADEMIC_PERIOD');});
test('CES rejects credits, averages, discounts, unknown periods and ambiguous identity',()=>{
 for(const name of ['Pregrado en Medicina (Valor por crédito académico)','Pregrado en Medicina promedio','Pregrado en Medicina desde','Pregrado en Medicina descuento'])assert.equal(extract(section(row(name))).records.length,0);
 assert.equal(extract(section(row('Pregrado en Medicina','COP 25.300.000,50'))).records.length,0);
 assert.throws(()=>extract(section(row(),2025)));
 assert.equal(extract(section(row()),[...names,['2','2708','MEDICINA','','Pregrado','Presencial','Pasto']]).records.length,0);
 assert.equal(extract(section(row()),[['1','1824','MEDICINA','','Pregrado','Presencial','Medellín']]).records.length,0);
});
