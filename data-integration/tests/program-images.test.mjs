import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCareerPhotoStore, searchUnsplash } from '../dist/services/program-images.js';

test('career photos persist, normalize names, and reserve distinct photos concurrently', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eduplan-photos-'));
  try {
    let calls = 0;
    const search = async () => { calls++; return [{ id: 1 }, { id: 2 }]; };
    const file = join(dir, 'photos.json');
    const resolve = createCareerPhotoStore(file, search);
    const [mechanical, civil] = await Promise.all([resolve('Ingeniería Mecánica'), resolve('Ingeniería Civil')]);
    assert.equal(mechanical.id, 1);
    assert.equal(civil.id, 2);
    assert.deepEqual(await resolve(' INGENIERIA MECANICA '), mechanical);
    assert.equal(calls, 2);
    assert.equal(await resolve('Bioingeniería'), null);
    assert.deepEqual(await createCareerPhotoStore(file, () => { throw new Error('Should use cache'); })('Ingeniería Civil'), civil);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('provider failures do not block later career selections', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eduplan-photos-'));
  try {
    let fail = true;
    const resolve = createCareerPhotoStore(join(dir, 'photos.json'), async () => {
      if (fail) throw new Error('Unavailable');
      return [{ id: 3 }];
    });
    await assert.rejects(resolve('Medicina'));
    fail = false;
    assert.equal((await resolve('Medicina')).id, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Unsplash retains hotlink tracking and attribution, and tracks each selection once', async () => {
  const originalFetch = globalThis.fetch;
  const dir = mkdtempSync(join(tmpdir(), 'eduplan-photos-'));
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(url).searchParams.get('query'), 'Ingeniería Mecánica');
      assert.equal(options.headers.Authorization, 'Client-ID test-key');
      return Response.json({ results: [{ id: 'abc', urls: { regular: 'https://images.unsplash.com/photo-abc?ixid=tracking' }, alt_description: 'Engine', user: { name: 'Photographer' }, links: { html: 'https://unsplash.com/photos/abc', download_location: 'https://api.unsplash.com/photos/abc/download' } }] });
    };
    const photos = await searchUnsplash('Ingeniería Mecánica', 'test-key');
    assert.equal(photos[0].src, 'https://images.unsplash.com/photo-abc?ixid=tracking');
    assert.equal(new URL(photos[0].sourceUrl).searchParams.get('utm_source'), 'eduplan');
    assert.equal(photos[0].id, 'unsplash:abc');
    let tracked = 0;
    const resolve = createCareerPhotoStore(join(dir, 'photos.json'), async () => photos, async photo => {
      assert.equal(photo.downloadUrl, 'https://api.unsplash.com/photos/abc/download');
      tracked++;
    });
    await resolve('Ingeniería Mecánica');
    await resolve('ingenieria mecanica');
    assert.equal(tracked, 1);
  } finally { globalThis.fetch = originalFetch; rmSync(dir, { recursive: true, force: true }); }
});
