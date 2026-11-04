import test from 'node:test';
import assert from 'node:assert/strict';
import { scholarships } from '../src/data/scholarships.js';
import { auditScholarships, filterScholarships, scholarshipStatus, scholarshipToday, scholarshipItem, uniqueScholarships, hasRepayment } from '../src/services/scholarships.js';
import { validSavedItem } from '../src/utils/saved.js';
const reference = new Date('2026-11-03T12:00:00-05:00');
const call = { ...scholarships[0], id: 'test-one', verification: 'verified', applicationStage: 'general', schedule: 'call', acceptingApplications: true, opensAt: '2026-11-01', deadline: '2026-11-03' };

test('catalog has unique editions, official URLs, explicit nulls, financial obligations and compatible saved snapshots', () => {
  assert(scholarships.length >= 25);
  assert.deepEqual(auditScholarships(scholarships, '2026-11-03').errors, []);
  for (const item of scholarships) {
    assert(validSavedItem(scholarshipItem(item)));
    assert(Object.values(scholarshipItem(item).snapshot).every(value => typeof value === 'string'));
    assert(item.opensAt === null || typeof item.opensAt === 'string');
    assert(item.deadline === null || typeof item.deadline === 'string');
    if (item.opensAt && item.opensAt.slice(0, 10) > '2026-11-03') assert.equal(item.acceptingApplications, false, 'Un anuncio futuro no prueba recepción de solicitudes');
  }
  for (const id of ['javeriana-bachiller-destacado-2027-1', 'uniandes-quiero-estudiar-2027-10', 'men-puedo-estudiar', 'sapiencia-creditos-condonables-pregrado', 'colfuturo-credito-beca-2027', 'fulbright-j-william-2027', 'icetex-beca-colombia-extranjeros-2026-2', 'erasmus-mundus-joint-masters']) assert(scholarships.some(item => item.id === id));
});
test('civil dates close after midnight in Colombia, without using UTC day', () => {
  assert.equal(scholarshipToday(new Date('2026-11-04T02:00:00Z')), '2026-11-03');
  assert.equal(scholarshipStatus(call, new Date('2026-11-04T04:59:59.999Z')), 'open');
  assert.equal(scholarshipStatus(call, new Date('2026-11-04T05:00:00Z')), 'closed');
});
test('a published time is respected exactly and expiry beats a stale open flag', () => {
  const timed = { ...call, deadline: '2026-11-03T17:00:00-05:00' };
  assert.equal(scholarshipStatus(timed, new Date('2026-11-03T21:59:59.999Z')), 'open');
  assert.equal(scholarshipStatus(timed, new Date('2026-11-03T22:00:00Z')), 'closed');
  assert.equal(scholarshipStatus(timed, new Date('2026-11-03T22:00:00.001Z')), 'closed');
});
test('opening needs evidence; announced opening never enables applications by itself', () => {
  const next = { ...call, opensAt: '2026-11-05T08:00:00-05:00', deadline: '2026-11-10', acceptingApplications: false };
  assert.equal(scholarshipStatus(next, reference), 'upcoming');
  assert.equal(scholarshipStatus(next, new Date('2026-11-05T13:00:00Z')), 'review');
  assert.equal(scholarshipStatus({ ...next, verification: 'partial' }, reference), 'review');
});
test('unknown dates, institutional schedules, partial verification and preselection are distinguished', () => {
  assert.equal(scholarshipStatus({ ...call, deadline: null }, reference), 'review');
  assert.equal(scholarshipStatus({ ...call, deadline: null, schedule: 'institutional' }, reference), 'institutional');
  assert.equal(scholarshipStatus({ ...call, applicationStage: 'preselection' }, reference), 'review');
  assert.equal(scholarshipStatus({ ...call, verification: 'partial' }, reference), 'review');
  assert.equal(scholarshipStatus({ ...call, deadline: '2026-02-30' }, reference), 'review');
});
test('credit and contribution obligations cannot appear in the no repayment filter', () => {
  for (const type of ['Crédito', 'Crédito condonable', 'Crédito-beca']) {
    const credit = { ...call, type };
    assert(hasRepayment(credit)); assert.equal(filterScholarships([credit], { repayment: 'no' }, reference).length, 0);
  }
  assert(hasRepayment(scholarships.find(item => item.id === 'uniandes-quiero-estudiar-2027-10')));
});
test('combined filters search accents, levels, location, eligibility, coverage and audience', () => {
  const sample = { ...call, name: 'Educación en Bogotá', type: 'Beca parcial', tags: ['Ingreso'], levels: ['Maestría'], eligibility: 'Colombianos', coverage: 'Matrícula completa' };
  const filters = { query: 'educacion bogota', level: 'Posgrado', city: sample.city, type: 'Beca parcial', audience: 'Ingreso', eligibility: 'Colombianos', coverage: 'matricula', repayment: 'no', status: 'open' };
  assert.equal(filterScholarships([sample], filters, reference).length, 1);
  assert.equal(filterScholarships([sample], { ...filters, audience: 'Matriculados' }, reference).length, 0);
  assert.equal(filterScholarships(scholarships, { query: 'zzzz-no-result-137' }, reference).length, 0);
});
test('Colombia includes its regions, while international mobility follows the study destination', () => {
  const regional = { ...call, city: 'Bogotá', region: 'Bogotá y Cundinamarca' };
  assert.equal(filterScholarships([regional], { city: 'Colombia' }, reference).length, 1);
  const mobility = { ...call, city: 'Chía', region: 'Exterior' };
  assert.equal(filterScholarships([mobility], { city: 'Colombia' }, reference).length, 0);
  assert.equal(filterScholarships([regional], { query: 'cundinamarca' }, reference).length, 1);
});
test('sorting prioritizes verified open calls by default and announced openings on request', () => {
  const items = [{ ...call, id: 'closed-one', name: 'A', deadline: '2026-10-01' }, { ...call, id: 'future-one', name: 'B', opensAt: '2027-01-01', deadline: '2027-02-01' }, { ...call, id: 'open-one', name: 'C' }];
  assert.deepEqual(filterScholarships(items, {}, reference).map(item => item.id), ['open-one', 'future-one', 'closed-one']);
  assert.equal(filterScholarships(items, { order: 'opening' }, reference)[0].id, 'future-one');
  assert.equal(filterScholarships(items, { order: 'asc' }, reference)[0].name, 'A');
  assert.equal(filterScholarships([{ ...call, id: 'old', verifiedAt: '2026-10-01' }, { ...call, id: 'new', name: 'Other', verifiedAt: '2026-11-03' }], { order: 'verified' }, reference)[0].id, 'new');
});
test('duplicate identities and repeated editions are excluded and surfaced in the audit', () => {
  assert.equal(uniqueScholarships([call, call, { ...call, id: 'duplicate-other-id' }]).length, 1);
  assert(auditScholarships([call, call], '2026-11-03').errors.length);
});
test('editorial audit flags broken dates, URLs and stale reviews without changing verification dates', () => {
  const bad = { ...call, officialUrl: 'javascript:alert(1)', deadline: 'Consultar convocatoria', opensAt: '2026-02-30', verifiedAt: '2026-01-01' };
  const audit = auditScholarships([bad], '2026-11-03');
  assert(audit.errors.length >= 3); assert(audit.warnings.length); assert.equal(bad.verifiedAt, '2026-01-01');
});
