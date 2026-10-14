import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{extractReviewedCaldasTuition}from'../tools/caldas-reviewed-tuition.mjs';
const review=JSON.parse(readFileSync(new URL('../data/caldas-reviewed-tuition-2026.json',import.meta.url)));
const row=review.rows.find(r=>r.name==='Especialización en Obstetricia y Ginecología');
const names=[['1','1112',row.name,'','Posgrado','Presencial','Manizales']];
const extract=(r={...review,rows:[row]},n=names,hash=review.contentSha256,date='2026-10-14')=>extractReviewedCaldasTuition(r,hash,n,date);
test('Caldas keeps the literal current column, page and unspecified academic period',()=>{const r=extract().records[0];assert.equal(r.amount,18294822);assert.equal(r.sourcePage,3);assert.equal(r.billingPeriod,'ACADEMIC_PERIOD');});
test('changed reviewed Caldas PDF, future year or invalid values are rejected',()=>{assert.throws(()=>extract(undefined,names,'a'.repeat(64)));assert.throws(()=>extract(undefined,names,review.contentSha256,'2027-10-14'));assert.throws(()=>extract({...review,rows:[{...row,amount:18.5}]}));});
test('Caldas rejects another campus, duplicates and conflicting territorial doctorate prices',()=>{assert.equal(extract(undefined,[['1','1112',row.name,'','Posgrado','Presencial','Armenia']]).records.length,0);assert.equal(extract(undefined,[...names,['2','1112',row.name,'','Posgrado','Virtual','Manizales']]).records.length,0);assert.equal(extract({...review,rows:[{...row,name:'Doctorado en Estudios Territoriales'}]},[['1','1112','Doctorado en Estudios Territoriales','','Posgrado','Presencial','Manizales']]).records.length,0);});

 test('explicit active-and-new-cohort scope covers shared program names without selecting a code',()=>{
 const duplicate=[...names,['2','1112',row.name,'','Posgrado','Presencial','Manizales']];
 const r=extract(undefined,duplicate).records;
 assert.equal(r.length,2);assert.deepEqual(r.map(v=>v.sniesCode),['1','2']);assert.equal(r[0].amount,r[1].amount);
 assert.equal(extract({...review,scope:undefined,rows:[row]},duplicate).records.length,0);
 });
