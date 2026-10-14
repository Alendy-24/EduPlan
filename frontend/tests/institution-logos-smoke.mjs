// Image/API fixtures exercise the UI without contacting Logo.dev or MEN.
// Run against Vite with VITE_LOGO_DEV_TOKEN=pk_fixture_only (not a real key).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const errors = [], requests = [];
page.on('pageerror', error => errors.push(error.message));
const fixtures = [
  { code: '1701', name: 'Javeriana Bogotá', website: 'www.javeriana.edu.co', municipality: 'Bogotá' },
  { code: '1702', name: 'Javeriana Cali', website: 'www.puj.edu.co', municipality: 'Cali' },
  { code: '1101', name: 'Universidad Nacional', website: 'www.unal.edu.co' },
  { code: '900001', name: 'Institución sin imagen', website: 'missing.edu.co' },
  { code: '3114', name: 'Escuela con emblema pendiente', website: 'www.armada.mil.co' },
  { code: '900002', name: 'Institución sin sitio', website: 'No disponible' },
  { code: '900003', name: 'Institución con cuota agotada', website: 'quota.edu.co' },
];
await context.route('https://img.logo.dev/**', route => {
  const url = new URL(route.request().url());
  requests.push(url);
  if (url.pathname === '/missing.edu.co') return route.fulfill({ status: 404, body: '' });
  if (url.pathname === '/quota.edu.co') return route.fulfill({ status: 429, body: '' });
  return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="12" fill="#102653"/><text x="64" y="80" text-anchor="middle" fill="white" font-size="52">U</text></svg>' });
});
await context.route('**/api/institutions?**', route => {
  const changed = new URL(route.request().url()).searchParams.get('name');
  return route.fulfill({ json: { data: changed ? [
    { ...fixtures[3], name: 'Institución con sitio corregido', website: 'corrected.edu.co' },
  ] : fixtures, hasMore: false } });
});
const out = '.tools/qa/institution-logos';
await context.route('**/api/institutions/*', route => {
  const code = new URL(route.request().url()).pathname.split('/').at(-1);
  const institution = fixtures.find(item => item.code === code);
  return institution ? route.fulfill({ json: institution }) : route.fulfill({ status: 404, json: {} });
});
await mkdir(out, { recursive: true });
try {
  await page.goto(base + '/instituciones');
  await page.getByRole('heading', { name: 'Javeriana Bogotá', exact: true }).waitFor();
  await page.locator('.institution-card').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.institution-card-cover img')];
    return images.length === 7 && images.every(img => img.complete && img.naturalWidth > 0);
  });
  const images = page.locator('.institution-card-cover img');
  const bogota = await images.nth(0).getAttribute('src');
  assert.equal(bogota, '/logos/javeriana.jpg');
  assert.equal(await images.nth(1).getAttribute('src'), bogota);
  assert.equal(await images.nth(2).getAttribute('src'), '/logos/unal.png');
  for (let index = 3; index < fixtures.length; index++) {
    assert.match(await images.nth(index).getAttribute('class'), /fallback/);
    assert(!((await images.nth(index).getAttribute('src')).includes('logo.dev')));
  }
  assert(!requests.some(url => url.pathname.includes('armada')));
  assert(requests.every(url => url.searchParams.get('fallback') === '404'));
  await page.getByRole('link', { name: 'Logos proporcionados por Logo.dev' }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: out + '/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.institution-card').first().scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: out + '/mobile.png', fullPage: true });
  await page.getByLabel('Buscar instituciones por nombre').fill('corregida');
  await page.getByRole('heading', { name: 'Institución con sitio corregido', exact: true }).waitFor();
  await page.locator('.institution-card').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const img = document.querySelector('.institution-card-cover img');
    return img?.src.includes('/corrected.edu.co?') && img.complete && img.naturalWidth > 0;
  });
  await page.goto(base + '/instituciones/1101');
  await page.getByRole('heading', { name: 'Universidad Nacional', exact: true }).waitFor();
  await page.locator('.institution-detail-logo').evaluate(img => img.decode());
  assert.equal(await page.locator('.institution-detail-logo').getAttribute('src'), '/logos/unal.png');
  await page.goto(base + '/instituciones/900001');
  await page.getByRole('heading', { name: 'Institución sin imagen', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.institution-detail-logo')?.classList.contains('institution-logo-fallback'));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.goto(base + '/instituciones/1702');
  await page.getByRole('heading', { name: 'Javeriana Cali', exact: true }).waitFor();
  await page.locator('.institution-detail-logo').evaluate(img => img.decode());
  assert.equal(await page.locator('.institution-detail-logo').getAttribute('src'), '/logos/javeriana.jpg');
  assert.deepEqual(errors, []);
  console.log('Institution logos: shared campus image, 404/429 fallback, invalid sites, disabled identities, changed filters and mobile layout passed.');
} finally {
  await browser.close();
}
