import test from 'node:test';
import assert from 'node:assert/strict';
import { tuitionCoverage } from '../dist/services/tuition-coverage.js';
const program={sourceId:'1',status:'Activo',sniesCode:'1',institutionCode:'1706',institutionName:'Externado',name:'Derecho',modality:'Presencial',municipality:'Bogotá',tuition:{amount:100,currency:'COP',basis:'NEW_STUDENT_REPORTED'}};
test('coverage counts unresolved active offers and distinguishes dated institutional prices from SNIES',()=>{
  const report=tuitionCoverage([program,{...program,sourceId:'duplicate'},
    {...program,sourceId:'2',sniesCode:'2',tuition:{...program.tuition,basis:'INSTITUTION_PUBLISHED',priceYear:2026}},
    {...program,sourceId:'3',sniesCode:undefined,tuition:undefined},
    {...program,sourceId:'4',status:'Inactivo'}],2026);
  assert.equal(report.activeOffers,3);assert.equal(report.reportedPrices,2);assert.equal(report.currentInstitutionalPrices,1);
  assert.equal(report.missing[0].reason,'UNRESOLVED_IDENTITY');assert.equal(report.institutions[0].missing,1);
});
test('expired institutional prices and an empty universe do not claim coverage',()=>{
  assert.equal(tuitionCoverage([{...program,tuition:{...program.tuition,basis:'INSTITUTION_PUBLISHED',priceYear:2025}}],2026).reportedPrices,0);
  assert.equal(tuitionCoverage([],2026).reportedCoveragePercent,null);
});
