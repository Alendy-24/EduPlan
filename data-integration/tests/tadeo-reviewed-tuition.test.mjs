import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {extractReviewedTadeoTuition} from '../tools/tadeo-reviewed-tuition.mjs';
const review=JSON.parse(readFileSync(new URL('../data/tadeo-reviewed-tuition-2026.json',import.meta.url)));
const hashes=Object.fromEntries(Object.entries(review.documents).map(([k,v])=>[k,v.sha256]));
const row=review.rows.find(r=>r.name==='Arquitectura');
const names=[['1','1707','ARQUITECTURA','','Pregrado','Presencial','Bogotá, D.C.']];
const extract=(r={...review,rows:[row]},n=names,h=hashes,date='2026-10-14')=>extractReviewedTadeoTuition(r,h,n,date);
test('reviewed Tadeo row retains visual source page and academic period',()=>{const r=extract().records[0];assert.equal(r.amount,10572000);assert.equal(r.sourcePage,1);assert.equal(r.billingPeriod,'ACADEMIC_PERIOD');assert.equal(r.reviewMethod,'VISUAL_OFFICIAL_PDF');});
test('changed PDF, missing amendment or another year requires a new visual review',()=>{
 assert.throws(()=>extract(undefined,names,{...hashes,base:'a'.repeat(64)}));
 assert.throws(()=>extract(undefined,names,{base:hashes.base}));
 assert.throws(()=>extract(undefined,names,hashes,'2027-10-14'));
 assert.throws(()=>extract({...review,documents:{base:review.documents.base},rows:[row]}));
});
test('reviewed fee never spreads to a different city, campus, modality or ambiguous SNIES',()=>{
 assert.equal(extract(undefined,[['1','1707','ARQUITECTURA','','Pregrado','Presencial','Santa Marta']]).records.length,0);
 assert.equal(extract(undefined,[...names,['2','1707','ARQUITECTURA','','Pregrado','Presencial','Bogotá, D.C.']]).records.length,0);
 assert.equal(extract(undefined,[['1','1701','ARQUITECTURA','','Pregrado','Presencial','Bogotá, D.C.']]).records.length,0);
 const virtual=review.rows.find(r=>r.name==='Especialización en Finanzas Computacionales');
 assert.equal(extract({...review,rows:[virtual]},[['1','1707',virtual.name,'','Posgrado','Presencial',virtual.municipality]]).records.length,0);
});
test('daytime price cannot overwrite programs with an unresolved nightly tariff',()=>{
 const r={...row,name:'Publicidad'};const result=extract({...review,rows:[r]},[['1','1707','PUBLICIDAD','','Pregrado','Presencial','Bogotá, D.C.']]);
 assert.equal(result.records.length,0);assert.equal(result.outcomes[0].reason,'VARIABLE_BY_SHIFT');
});
test('malformed visually reviewed amounts and pages are rejected',()=>{
 for(const changes of [{amount:0},{amount:10572000.5},{sourcePage:0},{sourcePage:12},{document:'unknown'}])assert.throws(()=>extract({...review,rows:[{...row,...changes}]}));
});

test('changed reviewed documents quarantine current Tadeo prices while preserving unrelated offers',async()=>{
 const {quarantineChangedTadeoReview}=await import('../tools/tadeo-reviewed-tuition.mjs');
 const a={institutionCode:'1707',collector:'TADEO_REVIEWED_PDF_V1',priceYear:2026};
 const other={institutionCode:'1830',collector:'UAO_POSTGRADUATE_COMPLETE_V1',priceYear:2026};
 assert.deepEqual(quarantineChangedTadeoReview(review,{...hashes,base:'a'.repeat(64)},[a,other]),[other]);
 assert.deepEqual(quarantineChangedTadeoReview(review,hashes,[a,other]),[a,other]);
});
