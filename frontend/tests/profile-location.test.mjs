import test from 'node:test';
import assert from 'node:assert/strict';
import { departments, coherentPreferences, changeLocation, validLocation, findCity } from '../src/utils/profile-location.js';

const original = { academicLevel:'Pregrado', modality:'Presencial', mobility:'CITY', department:'Antioquia', municipality:'Medellín' };
test('DIVIPOLA includes 32 departments and Bogotá with unique codes', () => {
  assert.equal(departments.length,33);
  assert.equal(new Set(departments.map(d=>d.code)).size,33);
  const cities = departments.flatMap(d=>d.cities);
  assert.equal(cities.length,1122);
  assert.equal(new Set(cities.map(c=>c.code)).size,cities.length);
});
test('changing department clears the city without mutating the saved profile', () => {
  const updated = changeLocation(original,'department','Cundinamarca');
  assert.equal(updated.municipality,'');
  assert.equal(validLocation(updated),false);
  assert.equal(original.municipality,'Medellín');
  assert.equal(findCity('Cundinamarca','Medellín'),undefined);
  assert.equal(validLocation({...updated,municipality:'Chía'}),true);
});
test('legacy incoherent pairs are repaired only in the editable draft', () => {
  const saved = {...original,department:'Cundinamarca'};
  assert.equal(coherentPreferences(saved).municipality,'');
  assert.equal(saved.municipality,'Medellín');
});
test('department and national coverage discard unneeded location fields', () => {
  const department = changeLocation(original,'mobility','DEPARTMENT');
  assert.equal(department.department,'Antioquia');
  assert.equal(department.municipality,'');
  assert.equal(validLocation(department),true);
  for(const mobility of ['ANY','RELOCATE']) {
    const national = changeLocation(original,'mobility',mobility);
    assert.equal(national.department,'');assert.equal(national.municipality,'');assert.equal(validLocation(national),true);
  }
  assert.equal(validLocation({...original,mobility:''}),false);
});
test('accents, capitalization and Bogotá aliases recover real legacy locations', () => {
  assert.deepEqual(coherentPreferences({...original,department:'ANTIOQUIA',municipality:'MEDELLIN'}),original);
  const bogota = coherentPreferences({...original,department:'Bogotá D.C.',municipality:'Bogota'});
  assert.equal(bogota.department,'Bogotá, D.C.');assert.equal(bogota.municipality,'Bogotá, D.C.');assert.equal(validLocation(bogota),true);
});
