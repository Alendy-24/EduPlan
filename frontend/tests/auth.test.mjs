import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticate } from '../src/services/auth.js';
test('authentication distinguishes unavailable service, validation, conflict and inactive account', async t => {
  const signal = new AbortController().signal;
  for (const status of [502, 503, 504]) {
    t.mock.method(globalThis, 'fetch', async () => new Response('', { status }));
    await assert.rejects(authenticate('register', {}, signal), /servicio de acceso no está disponible/);
    t.mock.restoreAll();
  }
  for (const [status, message] of [[409, /correo ya está registrado/], [403, /cuenta está inactiva/]]) {
    t.mock.method(globalThis, 'fetch', async () => new Response('', { status }));
    await assert.rejects(authenticate('register', {}, signal), message);
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, 'fetch', async () => Response.json({ fields: { password: 'never echo server internals', email: 'invalid' } }, { status: 400 }));
  await assert.rejects(authenticate('register', {}, signal), error => /contraseña.*correo/.test(error.message) && !error.message.includes('server internals'));
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  await assert.rejects(authenticate('login', {}, signal), /servicio de acceso no está disponible/);
});
