import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import logoAssets from '../src/data/scholarship-logo-assets.json' with { type: 'json' };
import { resolveScholarshipBrand, scholarshipBrands } from '../src/data/scholarship-brands.js';

test('reviewed providers resolve exact official hosts without matching names or unrelated institutions', () => {
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://www.javeriana.edu.co/becas' }).src, '/logos/javeriana.jpg');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://bienestar.bogota.unal.edu.co/convocatorias.php' }).src, '/logos/unal.png');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://www.agenciaatenea.gov.co/convocatorias/becas-libre-y-america' }).id, 'atenea');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://evil.example/javeriana', provider: 'Javeriana' }).id, 'unlisted');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://javeriana.edu.co.evil.example/becas' }).id, 'unlisted');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://unreviewed.uis.edu.co/' }).id, 'unlisted');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'javascript:alert(1)' }).src, null);
});

test('local official images exist, reuse institutional assets and have provenance', () => {
  const used = new Set();
  for (const brand of scholarshipBrands) {
    assert.equal(new URL(brand.sourceUrl).protocol, 'https:');
    for (const host of brand.hosts) { assert(!used.has(host)); used.add(host); }
    const result = resolveScholarshipBrand({ officialUrl: `https://${brand.hosts[0]}/` });
    if (result.src) {
      assert(result.src.startsWith('/logos/'));
      assert(existsSync(new URL(`../public${result.src}`, import.meta.url)));
      assert(result.imagePolicy);
    }
  }
  const emblem = readFileSync(new URL('../public/logos/scholarships/eu-emblem.svg', import.meta.url), 'utf8');
  assert(!/<script|<foreignObject|https?:\/\//i.test(emblem.replace('http://www.w3.org/2000/svg', '')));
});

test('reviewed logos use local files and unverified identities retain a text fallback', () => {
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://www.eafit.edu.co/becas-y-financiacion/becas-talento-eafit' }).src, '/logos/scholarships/eafit.svg');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://web.icetex.gov.co/becas' }).src, '/logos/scholarships/icetex.webp');
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://www.colombia.emb-japan.go.jp/itpr_es/pregrado.html' }).src, null);
  const unknown = resolveScholarshipBrand({ provider: 'Entidad nueva', officialUrl: null });
  assert.equal(unknown.name, 'Entidad nueva'); assert.equal(unknown.shortLabel, 'Entidad');
});

test('downloaded brand assets have verified bytes, local delivery and traceable sources', () => {
  assert.equal(logoAssets.length, 25);
  assert.equal(new Set(logoAssets.map(asset => asset.id)).size, logoAssets.length);
  for (const asset of logoAssets) {
    const bytes = readFileSync(new URL(`../public${asset.src}`, import.meta.url));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.equal(new URL(asset.assetUrl).protocol, 'https:');
    assert.equal(new URL(asset.sourcePage).protocol, 'https:');
    assert(bytes.length < 100000, `${asset.id} must remain compact`);
    const brand = scholarshipBrands.find(value => value.id === asset.id);
    assert.equal(resolveScholarshipBrand({ officialUrl: `https://${brand.hosts[0]}/` }).src, asset.src);
    if (asset.src.endsWith('.svg')) {
      const svg = bytes.toString();
      assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      assert(!/<script|<foreignObject|\son[a-z]+\s*=/i.test(svg));
      for (const match of svg.matchAll(/(?:xlink:)?href=["']([^"']+)/g)) assert(match[1].startsWith('#') || match[1].startsWith('data:image/'));
    }
  }
  assert.equal(resolveScholarshipBrand({ officialUrl: 'https://www.colfuturo.org/' }).tone, 'dark');
  const credits = readFileSync(new URL('../public/logos/scholarships/credits.html', import.meta.url), 'utf8');
  assert(credits.includes('Utb digital') && credits.includes('https://creativecommons.org/licenses/by-sa/4.0/'));
});
