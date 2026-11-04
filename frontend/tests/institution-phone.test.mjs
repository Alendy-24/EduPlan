import test from 'node:test';
import assert from 'node:assert/strict';
import { formatColombianPhone, resolveInstitutionPhone } from '../src/utils/institution-phone.js';

test('local fixed lines use the department area code and mobile numbers keep their digits', () => {
  for (const [department, code] of [['Bogotá D.C.', '601'], ['Cundinamarca', '601'], ['Cauca', '602'], ['Antioquia', '604'], ['Atlántico', '605'], ['Caldas', '606'], ['Arauca', '607'], ['Amazonas', '608'], ['San Andrés y Providencia', '608']]) {
    assert.equal(formatColombianPhone('3165000', department).href, `tel:+57${code}3165000`);
  }
  assert.equal(formatColombianPhone('3134568263', 'Bogotá D.C.').label, '+57 313 456 8263');
  assert.equal(formatColombianPhone('(601) 316 5000', 'Caldas').label, '+57 601 316 5000');
  assert.equal(formatColombianPhone('+57 (1) 3165000', '').href, null, 'Do not repair unsupported incomplete international formats');
  assert.equal(formatColombianPhone('(1) 3165000', '').href, 'tel:+576013165000');
});

test('extensions survive normalization; malformed and ambiguous values are never callable', () => {
  assert.equal(formatColombianPhone('+57 (601) 3165000 Ext. 83000').href, 'tel:+576013165000;ext=83000');
  for (const value of ['604100', '57 2 22091', '1', '3165000 / 4309000', '3165000 ext. 10-20', 'javascript:3165000', '018000116263', '+44 2071234567']) {
    assert.equal(formatColombianPhone(value, 'Bogotá D.C.').href, null);
  }
  assert.equal(formatColombianPhone('3165000', 'Desconocido').status, 'review');
  for (const value of ['NA', '', null]) assert.equal(formatColombianPhone(value).status, 'missing');
});

test('reviewed corrections are campus specific, preserve raw MEN data and stop applying to updated rows', () => {
  const institution = { code: '1101', municipality: 'Bogotá, D.C.', department: 'Bogotá D.C.', phone: '3165000' };
  const result = resolveInstitutionPhone(institution);
  assert.equal(result.label, '+57 601 316 5000');
  assert.equal(result.verified, true);
  assert.equal(result.raw, '3165000');
  assert.equal(institution.phone, '3165000');
  assert.equal(resolveInstitutionPhone({ ...institution, phone: '4068888' }).verified, false);
  assert.equal(resolveInstitutionPhone({ ...institution, municipality: 'Medellín' }).verified, false);
  assert.equal(resolveInstitutionPhone({ code: '1817', municipality: 'Bucaramanga', phone: '343825' }).href, 'tel:+576076978500');
  assert.equal(resolveInstitutionPhone({ code: '9911', municipality: 'Buenaventura', phone: '1' }).href, 'tel:+576023212100');
});
