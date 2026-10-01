import test from 'node:test';
import assert from 'node:assert/strict';
import {scholarships} from '../src/data/scholarships.js';
import {filterScholarships,scholarshipStatus,scholarshipToday,scholarshipItem} from '../src/services/scholarships.js';
test('opportunities have official sources, reviewed dates, requirements and account-safe snapshots',()=>{
 assert.equal(scholarships.length,8);assert.equal(new Set(scholarships.map(item=>item.id)).size,8);
 for(const item of scholarships){assert.equal(new URL(item.officialUrl).protocol,'https:');assert(item.requirements.length>0);assert(/^\d{4}-\d{2}-\d{2}$/.test(item.verifiedAt));assert(Object.values(scholarshipItem(item).snapshot).every(value=>typeof value==='string'));}
});
test('past dates close opportunities and an announced opening does not imply applications were enabled',()=>{
 assert.equal(scholarshipStatus({deadline:'2026-05-15',acceptingApplications:true},'2026-09-29'),'closed');
 assert.equal(scholarshipStatus({opensAt:'2027-01-04',deadline:'2027-03-04'},'2026-09-29'),'upcoming');
 assert.equal(scholarshipStatus({opensAt:'2027-01-04',deadline:'2027-03-04'},'2027-01-04'),'review');
 assert.equal(scholarshipStatus({deadline:''},'2026-09-29'),'review');
 assert.equal(scholarshipToday(new Date('2026-09-30T02:00:00Z')),'2026-09-29');
});
test('eligibility filters use declared levels and coverage without inferring qualification',()=>{
 const all={name:'Universal',provider:'Entidad',description:'',location:'Colombia',coverage:'',requirements:[],type:'Apoyo',city:'Bogotá',region:'Colombia',levels:['Todos los niveles']};
 assert.equal(filterScholarships([all],{level:'Posgrado',city:'Colombia'}).length,1);
 assert.equal(filterScholarships(scholarships,{query:'bachiller destacado',level:'Pregrado'})[0].id,'javeriana-bachiller-destacado-2027-1');
 assert(filterScholarships(scholarships,{status:'closed'},'2026-09-29').every(item=>item.deadline<'2026-09-29'));
});
