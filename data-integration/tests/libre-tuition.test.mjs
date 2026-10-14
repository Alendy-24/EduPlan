import test from 'node:test';
import assert from 'node:assert/strict';
import {extractLibreTuition,LIBRE_RESOLUTION} from '../tools/libre-tuition.mjs';
const campuses=['Bogotá','Barranquilla','Cali','Pereira','Cartagena','Cúcuta','El Socorro'];
const fixture=(rows,year=2026)=>campuses.map((c,i)=>`<p>Artículo ${i+4}. De la Seccional ${c}. El valor para la vigencia ${year}</p><figure><table><tr><th>PROGRAMA</th><th>SEMESTRE O AÑO</th><th>VALOR DE MATRICULA ${year}</th></tr><tr><td>CICLO I</td><td>CICLO II</td></tr><tr><td>PREGRADO</td></tr>${i===0?rows:''}</table></figure>`).join('');
const names=[['1','1806','DERECHO','','Pregrado','Presencial','Bogotá, D.C.']];
const extract=(html,ids=names)=>extractLibreTuition(html,LIBRE_RESOLUTION,ids,'2026-10-14');
test('Libre selects first-entry price through rowspans and does not take later cohorts',()=>{
 const r=extract(fixture('<tr><td rowspan="2">Derecho semestralizado</td><td>I – V</td><td>$ 7.700.000</td><td>$ 7.700.000</td></tr><tr><td>VI – X</td><td>$ 6.000.000</td><td>$ 6.000.000</td></tr>'));
 assert.equal(r.records.length,1);assert.equal(r.records[0].amount,7700000);assert.equal(r.records[0].billingPeriod,'SEMESTER');
});
test('Libre rejects missing, different-cycle, decimal and later-cohort amounts',()=>{
 for(const [period,a,b] of [['II – X','$ 7.700.000','$ 7.700.000'],['I','N/A','N/A'],['I','$ 7.700.000','$ 7.800.000'],['I','$ 7.700.000,50','$ 7.700.000,50']]) assert.equal(extract(fixture(`<tr><td>Derecho</td><td>${period}</td><td>${a}</td><td>${b}</td></tr>`)).records.length,0);
});
test('Libre excludes ambiguous identity and different cities or modalities',()=>{
 const h=fixture('<tr><td>Derecho</td><td>I</td><td>$ 7.700.000</td><td>$ 7.700.000</td></tr>');
 assert.equal(extract(h,[...names,['2','1806','DERECHO','','Pregrado','Virtual','Bogotá, D.C.']]).records.length,0);
 assert.equal(extract(h,[['1','1806','DERECHO','','Pregrado','Presencial','Cartagena']]).records.length,0);
});
test('Libre rejects obsolete year, changed headers and incomplete campus tables',()=>{
 assert.throws(()=>extract(fixture('',2025)));
 assert.throws(()=>extract(fixture('').replace('CICLO II','CICLO III')));
 assert.throws(()=>extract(fixture('').replace('El Socorro','Otra')));
});
test('Libre keeps annual charges as academic period with explicit annual note',()=>{
 const r=extract(fixture('<tr><td>Derecho</td><td>Año</td><td>$ 14.000.000</td><td>$ 14.000.000</td></tr>'));
 assert.equal(r.records[0].billingPeriod,'ACADEMIC_PERIOD');assert.match(r.records[0].note,/anual/);
});
