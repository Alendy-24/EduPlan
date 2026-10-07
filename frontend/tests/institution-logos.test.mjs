import test from 'node:test';
import assert from 'node:assert/strict';
import { institutionLogoDomain, normalizeLogoDevToken, resolveInstitutionLogo } from '../src/utils/institution-logos.js';
import { institutionLogoBrands, institutionLogoOverrides } from '../src/data/institution-logos.js';

const token = 'pk_fixture_only';

test('website normalization preserves Colombian domains, paths and unknown subdomains correctly', () => {
  assert.equal(institutionLogoDomain(' HTTPS://WWW.JAVERIANA.EDU.CO/admisiones?q=a '), 'javeriana.edu.co');
  assert.equal(institutionLogoDomain('medellin.unal.edu.co/oferta'), 'medellin.unal.edu.co');
  assert.equal(institutionLogoDomain('www.uniminuto.edu'), 'uniminuto.edu');
  for (const value of [null, '', 'No disponible', 'no informa', 'www.', 'unir', 'www.rectoria@unillanos.edu.co', 'www taller5.edu.co', 'https://user:password@university.edu.co', 'javascript:alert(1)', 'https://127.0.0.1', 'edu.co', 'https://-invalid.edu.co', 'https://uni..edu.co']) {
    assert.equal(institutionLogoDomain(value), null, String(value));
  }
});

test('missing or secret keys make no remote logo URL', () => {
  const institution = { code: '2000', website: 'www.example.edu.co' };
  for (const value of [undefined, '', 'sk_secret', 'pk_', 'pk_bad key']) {
    assert.equal(normalizeLogoDevToken(value), '');
    assert.equal(resolveInstitutionLogo(institution, value).src, null);
  }
  const url = new URL(resolveInstitutionLogo(institution, token).src);
  assert.equal(url.origin, 'https://img.logo.dev');
  assert.equal(url.pathname, '/example.edu.co');
  assert.equal(url.searchParams.get('token'), token);
  assert.equal(url.searchParams.get('fallback'), '404');
  assert.equal(url.searchParams.get('redirect'), '404');
});

test('different campus codes and domains share the same brand URL without altering catalog identity', () => {
  const bogota = { code: '1701', website: 'www.javeriana.edu.co', municipality: 'Bogotá' };
  const cali = { code: 1702, website: 'www.puj.edu.co', municipality: 'Cali' };
  assert.deepEqual(resolveInstitutionLogo(bogota, token), resolveInstitutionLogo(cali, token));
  assert.equal(resolveInstitutionLogo(bogota, '').src, '/logos/javeriana.jpg');
  assert.equal(resolveInstitutionLogo(cali, '').src, '/logos/javeriana.jpg');
  assert.equal(cali.website, 'www.puj.edu.co');
  assert.equal(cali.code, 1702);
  assert.equal(resolveInstitutionLogo({ code: '9933', website: 'delapaz.unal.edu.co' }, token).src,
    resolveInstitutionLogo({ code: '1101', website: 'unal.edu.co' }, token).src);
  // Similar names must not implicitly group unrelated institutions.
  assert.notEqual(resolveInstitutionLogo({ code: '9999', name: 'Pontificia Universidad Javeriana', website: 'other.edu.co' }, token).src,
    resolveInstitutionLogo(bogota, token).src);
});

test('distinct schools under the Armada domain stay on fallback pending manual review', () => {
  for (const code of ['3114', '3901']) assert.equal(resolveInstitutionLogo({ code, website: 'www.armada.mil.co' }, token).src, null);
});

test('manual campus images take precedence over a shared brand, work without a key, and can be disabled', t => {
  const brand = institutionLogoBrands.find(item => item.id === 'javeriana');
  const originalLogo = brand.logoUrl;
  brand.logoUrl = '/logos/javeriana.webp';
  institutionLogoOverrides['1702'] = { logoUrl: '/logos/javeriana-cali.webp' };
  t.after(() => { brand.logoUrl = originalLogo; delete institutionLogoOverrides['1702']; });
  assert.equal(resolveInstitutionLogo({ code: '1701' }, '').src, '/logos/javeriana.webp');
  assert.equal(resolveInstitutionLogo({ code: '1702' }, '').src, '/logos/javeriana-cali.webp');
  institutionLogoOverrides['1702'].disabled = true;
  assert.equal(resolveInstitutionLogo({ code: '1702' }, token).src, null);
});
