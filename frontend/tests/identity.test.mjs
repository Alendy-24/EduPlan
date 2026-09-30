import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { userInitial, readAvatar, persistAvatar, compressAvatar } from '../src/utils/avatar.js';
import { institutionLabel } from '../src/utils/institutions.js';
import { normalizeProgram, academicProgramName } from '../src/utils/programs.js';
test('academic name and awarded title stay separate, including legacy snapshots', () => {
  const row = { sourceId: 'upr9-nkiz:test', name: 'INGENIERÍA DE SISTEMAS', nameOrigin: 'SNIES_NAME', awardedTitle: 'INGENIERO DE SISTEMAS', institutionCode: '1701', institutionWebsite: 'www.javeriana.edu.co' };
  const value = normalizeProgram(row);
  assert.equal(value.name, row.name); assert.notEqual(value.name, value.awardedTitle);
  assert.equal(value.institutionWebsite, row.institutionWebsite);
  assert.equal(academicProgramName({ ...row, nameOrigin: 'AWARDED_TITLE' }), 'Nombre del programa no disponible');
  assert.equal(normalizeProgram({ ...row, name: '', awardedTitle: 'ARQUITECTO' }).name, 'Nombre del programa no disponible');
});
test('same-name institutions have distinct human campus labels', () => {
  const principal = institutionLabel({ name: 'Pontificia Universidad Javeriana', code: '1701', municipality: 'Bogotá D.C.', campus: 'Principal' });
  const cali = institutionLabel({ name: 'Pontificia Universidad Javeriana', code: '1702', municipality: 'Cali', department: 'Valle del Cauca', campus: 'Seccional' });
  assert.match(principal, /Bogotá D.C. · Sede principal · Código 1701/);
  assert.match(cali, /Cali · Valle del Cauca · Seccional · Código 1702/);
  assert.notEqual(principal, cali);
});
test('avatar fallback uses the first useful character', () => {
  assert.equal(userInitial('  — Yua'), 'Y'); assert.equal(userInitial('Sebastián'), 'S'); assert.equal(userInitial(''), 'E');
});
test('local photos are isolated by account; removal restores fallback; storage errors are explicit', () => {
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key) };
  const photo = 'data:image/jpeg;base64,YQ==';
  persistAvatar(storage, 1, photo); assert.equal(readAvatar(storage, 1), photo); assert.equal(readAvatar(storage, 2), ''); assert.equal(readAvatar(storage, undefined), '');
  persistAvatar(storage, 2, photo); persistAvatar(storage, 1, ''); assert.equal(readAvatar(storage, 1), ''); assert.equal(readAvatar(storage, 2), photo);
  assert.throws(() => persistAvatar(storage, 1, 'data:image/svg+xml,x'), /no es válida/);
  assert.throws(() => persistAvatar(storage, 1, 'data:image/jpeg;base64,' + 'A'.repeat(120000)), /no es válida/);
  assert.throws(() => persistAvatar(null, 1, photo), /dispositivo/);
  assert.equal(readAvatar({ getItem() { throw Error(); } }, 1), '');
});
test('avatar rejects invalid and oversized files before decoding', async () => {
  await assert.rejects(compressAvatar({ type: 'text/plain', size: 10 }), /válida/);
  await assert.rejects(compressAvatar({ type: 'image/jpeg', size: 6 * 1024 * 1024 }), /5 MB/);
});
test('footer internal routes exist in the router', () => {
  const footer = readFileSync(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');
  const router = readFileSync(new URL('../src/routes/Routes.jsx', import.meta.url), 'utf8');
  for (const [, route] of footer.matchAll(/to="([^"]+)"/g)) if (route !== '/') assert(router.includes('path="' + route.slice(1) + '"'), route);
});
