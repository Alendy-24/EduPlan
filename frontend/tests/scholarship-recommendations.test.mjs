import test from 'node:test';
import assert from 'node:assert/strict';
import { scholarships } from '../src/data/scholarships.js';
import { evaluateScholarship, recommendScholarships } from '../src/services/scholarship-recommendations.js';
import { emptyFinancingPreferences, validFinancingPreferences } from '../src/utils/financing.js';
const now = new Date('2026-11-03T12:00:00-05:00');
const opportunity = { ...scholarships[0], id: 'test-financing', type: 'Beca parcial', levels: ['Pregrado'], city: 'Bogotá', region: 'Bogotá y Cundinamarca', verification: 'verified', schedule: 'call', applicationStage: 'general', acceptingApplications: true, opensAt: '2026-10-01', deadline: '2026-11-10', recommendationRules: { studentStages: ['entry'], support: ['tuition'], international: false } };
const profile = { preferences: { academicLevel: 'Pregrado', mobility: 'CITY', municipality: 'Bogotá' }, financing: { ...emptyFinancingPreferences, studentStage: 'entry', support: 'tuition', repayment: 'no', international: 'no' } };

test('several actual criteria produce explained affinity with no invented eligibility or percentage', () => {
  const row = evaluateScholarship(opportunity, profile, now);
  assert.equal(row.classification, 'match'); assert(row.recommendable);
  assert.match(row.explanation, /etapa|pregrado/); assert(row.matches.some(value => value.criterion === 'location'));
  assert(!('score' in row)); assert(!('percentage' in row)); assert.equal(row.incompatibilities.length, 0);
});
test('unanswered stage and admission remain unknown instead of assuming eligibility', () => {
  const row = evaluateScholarship({ ...opportunity, recommendationRules: { ...opportunity.recommendationRules, admissionRequired: true } }, { preferences: profile.preferences }, now);
  assert.equal(row.classification, 'confirm'); assert(row.pending.some(text => text.includes('admisión')));
});
test('known conflicting nationality is never highly recommended', () => {
  const foreign = { ...opportunity, eligibility: 'Extranjeros', recommendationRules: { nationalities: ['Extranjeros'] } };
  const declaredColombian = { ...profile, financing: { ...profile.financing, nationality: 'Colombianos' } };
  const row = evaluateScholarship(foreign, declaredColombian, now);
  assert.equal(row.classification, 'incompatible'); assert(!row.recommendable);
  assert.equal(recommendScholarships([foreign], declaredColombian, now).recommendations.length, 0);
});
test('a study city never proves residence, and an admission does not prove the right admission', () => {
  const restricted = { ...opportunity, recommendationRules: { residenceCities: ['Bogotá'], admissionRequired: true, institutionIds: ['unal'] } };
  const row = evaluateScholarship(restricted, { ...profile, financing: { ...profile.financing, admission: 'yes' } }, now);
  assert.equal(row.classification, 'confirm'); assert(row.pending.some(text => text.includes('no acredita residencia'))); assert(row.pending.some(text => text.includes('habilitados')));
});
test('confirmed lack of admission and a different funded-program stage are incompatible', () => {
  const row = evaluateScholarship({ ...opportunity, recommendationRules: { studentStages: ['enrolled'], admissionRequired: true } }, { ...profile, financing: { ...profile.financing, admission: 'no' } }, now);
  assert.equal(row.classification, 'incompatible'); assert.equal(row.incompatibilities.length, 2);
});
test('preselection always needs confirmation and is not a general open application', () => {
  const row = evaluateScholarship({ ...opportunity, applicationStage: 'preselection' }, profile, now);
  assert.equal(row.classification, 'confirm'); assert(!row.recommendable);
});
test('credit conflicts are preferences, not a fabricated official eligibility rejection', () => {
  const credit = { ...opportunity, type: 'Crédito condonable' };
  const row = evaluateScholarship(credit, profile, now);
  assert.equal(row.incompatibilities.length, 0); assert(row.preferenceConflicts.length); assert(!row.recommendable);
  assert(evaluateScholarship(credit, { ...profile, financing: { ...profile.financing, repayment: 'accepted' } }, now).recommendable);
});
test('closed and partially verified opportunities remain available in catalog evaluations but excluded from suggestions', () => {
  const closed = { ...opportunity, deadline: '2026-10-01' }, unverified = { ...opportunity, id: 'not-verified', name: 'Otra', verification: 'partial' };
  const result = recommendScholarships([closed, unverified], profile, now);
  assert.equal(result.evaluations.length, 2); assert.equal(result.recommendations.length, 0);
});
test('profile changes immediately change deterministic recommendations without mutating inputs', () => {
  const living = { ...opportunity, id: 'test-living', name: 'Sostenimiento', recommendationRules: { support: ['living'], international: false } };
  const copy = structuredClone(profile);
  assert.equal(recommendScholarships([opportunity, living], profile, now).recommendations[0].item.id, opportunity.id);
  const changed = { ...profile, financing: { ...profile.financing, support: 'living' } };
  assert.equal(recommendScholarships([opportunity, living], changed, now).recommendations[0].item.id, living.id);
  assert.deepEqual(profile, copy);
});
test('empty profiles retain current opportunities and explicitly request more information', () => {
  const result = recommendScholarships(scholarships, {}, now);
  assert(result.incomplete); assert(result.recommendations.length >= 3);
  assert(result.recommendations.every(row => row.classification !== 'match'));
  assert(result.recommendations.every(row => row.status !== 'closed'));
});
test('international preference, declared academic restrictions and published modality remain separate', () => {
  const international = { ...opportunity, city: 'Exterior', modality: 'Presencial', recommendationRules: { international: true, academicAreas: ['Ingeniería'] } };
  const row = evaluateScholarship(international, { ...profile, interests: { areas: ['Ingeniería'] }, preferences: { academicLevel: 'Pregrado', modality: 'Virtual' } }, now);
  assert(row.matches.some(match => match.criterion === 'area')); assert(row.pending.some(text => text.includes('Un interés no acredita formación previa')));
  assert(row.preferenceConflicts.length >= 2); assert(!row.recommendable);
});
test('optional finance contract rejects unknown, missing, coerced and malformed fields', () => {
  assert(validFinancingPreferences(emptyFinancingPreferences));
  assert(!validFinancingPreferences({ ...emptyFinancingPreferences, userId: 2 }));
  assert(!validFinancingPreferences({ ...emptyFinancingPreferences, admission: true }));
  assert(!validFinancingPreferences({ studentStage: 'entry' }));
});
test('Bogotá aliases match study location, and a specific degree preference does not match a different formation', () => {
  const row = evaluateScholarship(opportunity, { ...profile, preferences: { ...profile.preferences, municipality: 'Bogotá D.C.' } }, now);
  assert(row.matches.some(match => match.criterion === 'location'));
  const technical = { ...opportunity, levels: ['Tecnológica'] };
  const university = evaluateScholarship(technical, { ...profile, preferences: { ...profile.preferences, educationLevel: 'UNIVERSITY' } }, now);
  assert(!university.recommendable); assert(university.preferenceConflicts.length);
});
test('documented manual checks remain pending instead of certifying uncollected grades, income or language', () => {
  const row = evaluateScholarship({ ...opportunity, requirements: ['Acreditar promedio e idioma.'], recommendationRules: { ...opportunity.recommendationRules, manualRequirementIndexes: [0] } }, profile, now);
  assert.equal(row.classification, 'confirm'); assert(row.pending.some(text => text.includes('promedio e idioma')));
});
test('closing order compares actual Colombian instants rather than ISO string lengths', () => {
  const allDay = { ...opportunity, id: 'all-day', name: 'A', deadline: '2026-11-10' };
  const timed = { ...opportunity, id: 'at-five', name: 'B', deadline: '2026-11-10T17:00:00-05:00' };
  assert.equal(recommendScholarships([allDay, timed], profile, now).recommendations[0].item.id, 'at-five');
});
