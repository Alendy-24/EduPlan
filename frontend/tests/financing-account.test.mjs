import test from 'node:test';
import assert from 'node:assert/strict';
import { getFinancingPreferences, putFinancingPreferences } from '../src/services/account.js';
import { emptyFinancingPreferences } from '../src/utils/financing.js';

test('finance preferences read and write through authenticated account APIs, never public query identities', async () => {
  const original = globalThis.fetch, calls = [];
  try {
    globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(emptyFinancingPreferences), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
    assert.deepEqual(await getFinancingPreferences('test-account-token'), emptyFinancingPreferences);
    await putFinancingPreferences(emptyFinancingPreferences, 'test-account-token');
    assert(calls.every(call => call.url === '/api/me/financing-preferences' && call.options.headers.Authorization === 'Bearer test-account-token'));
    assert.equal(calls[1].options.method, 'PUT'); assert.deepEqual(JSON.parse(calls[1].options.body), emptyFinancingPreferences);
    await assert.rejects(putFinancingPreferences({ ...emptyFinancingPreferences, support: 'invented' }, 'test-account-token'), /Revisa/);
    assert.equal(calls.length, 2);
    globalThis.fetch = async () => new Response('{}', { status: 200 });
    await assert.rejects(getFinancingPreferences('test-account-token'), /no es válida/);
  } finally { globalThis.fetch = original; }
});
