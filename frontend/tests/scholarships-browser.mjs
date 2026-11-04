// Live UI with isolated local storage and explicit account API fixtures.
// These fixtures never create real accounts or alter the development database.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { scholarships } from '../src/data/scholarships.js';
import { emptyFinancingPreferences } from '../src/utils/financing.js';
import { getScholarships, scholarshipItem, hasRepayment } from '../src/services/scholarships.js';

const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const out = fileURLToPath(new URL('../../.tools/qa/scholarships/', import.meta.url));
await mkdir(out, { recursive: true });
const errors = [];
const guest = await browser.newContext();
const page = await guest.newPage();
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(30000);

async function visit(p, path = '/becas') {
  await p.goto(base + path);
  await p.getByRole('heading', { name: 'Becas y oportunidades para estudiar', exact: true }).waitFor();
}
const cardFor = (p, id) => p.locator('.scholarship-card').filter({ has: p.locator(`[id="title-${id}"]`) });

try {
  await visit(page);
  assert.equal(await page.locator('.scholarship-card').count(), Math.min(12, getScholarships().length));
  const firstId = await page.locator('.scholarship-card').first().getAttribute('id');
  const first = scholarships.find(item => item.id === firstId);
  assert(first, `Stable opportunity id missing: ${firstId}`);

  // Guest saves survive a reload; remove affects the same identity.
  await page.locator('.scholarship-card').first().getByRole('button', { name: `Guardar ${first.name}`, exact: true }).click();
  await page.reload();
  await cardFor(page, first.id).getByRole('button', { name: `Quitar de guardados ${first.name}`, exact: true }).waitFor();
  await cardFor(page, first.id).getByRole('button', { name: `Quitar de guardados ${first.name}`, exact: true }).click();
  assert.equal(await page.locator('.save-button[aria-pressed=true]').count(), 0);

  // Old saved links still resolve to their opportunity, including details.
  await visit(page, scholarshipItem(first).href);
  assert.equal(await page.locator('.scholarship-card').count(), 1);
  const detail = page.locator('.scholarship-detail').first();
  const summary = detail.locator('summary');
  assert.equal(await detail.getAttribute('open'), '');
  await summary.focus();
  await page.keyboard.press('Enter');
  assert.equal(await detail.getAttribute('open'), null);
  await page.keyboard.press('Enter');
  assert.equal(await detail.getAttribute('open'), '');
  assert(await detail.innerText());
  const official = page.locator('.scholarship-card a').filter({ hasText: /Fuente oficial/i }).first();
  assert.equal(await official.getAttribute('href'), first.officialUrl);

  // Combined URL filters and typed search preserve the filter state.
  await visit(page, `/becas?level=${encodeURIComponent(first.levels[0])}&type=${encodeURIComponent(first.type)}`);
  await page.getByLabel('Buscar oportunidades', { exact: true }).fill(first.name);
  await page.waitForFunction(() => new URLSearchParams(location.search).get('q'));
  await cardFor(page, first.id).waitFor();
  assert.equal(await page.getByLabel(/^Tipo de financiación/).inputValue(), first.type);
  assert.equal(await page.getByLabel(/^Nivel educativo/).inputValue(), first.levels[0]);
  await page.getByLabel('Buscar oportunidades', { exact: true }).fill('zzzz-sin-coincidencia-1379');
  await page.getByRole('heading', { name: 'Probemos con menos condiciones', exact: true }).waitFor();
  assert.equal(await page.locator('.scholarship-card').count(), 0);

  await visit(page);
  if (getScholarships().length > 12) {
    await page.getByRole('button', { name: /^Ver más oportunidades/ }).click();
    assert.equal(await page.locator('.scholarship-card').count(), Math.min(24, getScholarships().length));
  }
  await page.getByRole('button', { name: /^Abiertas/ }).click();
  const openCount = Math.min(12, getScholarships({ status: 'open' }).length);
  await page.waitForFunction(expected => document.querySelectorAll('.scholarship-card').length === expected, openCount);
  assert.equal(new URL(page.url()).searchParams.get('status'), 'open');
  await visit(page);
  await page.locator('.scholarship-more-filters summary').click();
  await page.getByLabel(/^Devolución/).selectOption('yes');
  await page.waitForFunction(() => new URLSearchParams(location.search).get('repayment') === 'yes');
  await page.waitForFunction(expected => JSON.stringify([...document.querySelectorAll('.scholarship-card')].map(node => node.id)) === JSON.stringify(expected), getScholarships({ repayment: 'yes' }).slice(0, 12).map(item => item.id));
  for (const id of await page.locator('.scholarship-card').evaluateAll(nodes => nodes.map(node => node.id))) assert(hasRepayment(scholarships.find(item => item.id === id)), `Payment filter included ${id}`);

  // Screenshots and geometric assertions exercise compact and expanded detail.
  await visit(page);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`);
    const undersized = await page.locator('main button:visible, main input:visible, main select:visible, main summary:visible').evaluateAll(nodes => nodes.filter(node => !node.disabled && node.getBoundingClientRect().height < 43).map(node => ({ text: node.textContent, height: node.getBoundingClientRect().height })));
    assert.deepEqual(undersized, [], `Small controls at ${width}px`);
    if (width === 1440 || width === 390) await page.screenshot({ path: `${out}/${width}.png`, fullPage: true });
  }
  await page.locator('.scholarship-detail').first().locator('summary').click();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Expanded detail overflows mobile');
  await page.screenshot({ path: `${out}/390-detail.png`, fullPage: true });

  // Authenticated writes exercise the real frontend sync code against explicit API fixtures.
  const account = await browser.newContext();
  await account.addInitScript(() => sessionStorage.setItem('eduplan-session-v1', JSON.stringify({ token: 'scholarship-fixture-token', user: { id: 4242, name: 'Prueba Becas', email: 'scholarships@example.test' }, expiresAt: Date.now() + 3600000 })));
  const saved = new Map();
  const writes = [];
  await account.route('**/api/me/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.endsWith('/financing-preferences')) return route.fulfill({ json: emptyFinancingPreferences });
    if (url.pathname.endsWith('/preferences')) return route.fulfill({ json: { academicLevel: '', educationLevel: '', modality: '', municipality: '', department: '', mobility: '' } });
    if (url.pathname.endsWith('/interests')) return route.fulfill({ json: { areas: [], motivations: [] } });
    if (url.pathname.endsWith('/matching-preferences')) return route.fulfill({ json: { specificNbcs: [], activities: [], contexts: [], excludedNbcs: [], locationImportance: '', modalityImportance: '', duration: '', sector: '', exclusionsReviewed: false } });
    assert(url.pathname.startsWith('/api/me/saved'), `Unexpected account request ${url.pathname}`);
    assert.equal(request.headers().authorization, 'Bearer scholarship-fixture-token');
    if (request.method() === 'GET') return route.fulfill({ json: { data: [...saved.values()] } });
    const id = decodeURIComponent(url.pathname.split('/').at(-1));
    writes.push(request.method());
    if (request.method() === 'DELETE') { saved.delete(id); return route.fulfill({ status: 204 }); }
    const payload = request.postDataJSON();
    assert(Object.values(payload.snapshot).every(value => typeof value === 'string'));
    const value = { id, ...payload, savedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saved.set(id, value);
    return route.fulfill({ json: value });
  });
  const signed = await account.newPage();
  signed.on('pageerror', error => errors.push(error.message));
  await visit(signed, scholarshipItem(first).href);
  const save = signed.getByRole('button', { name: `Guardar ${first.name}`, exact: true });
  await save.waitFor();
  await signed.waitForFunction(() => !document.querySelector('.save-button')?.disabled);
  const put = signed.waitForResponse(response => response.request().method() === 'PUT' && response.url().includes('/api/me/saved/'));
  await save.click();
  assert.equal((await put).status(), 200);
  await signed.reload();
  const remove = signed.getByRole('button', { name: `Quitar de guardados ${first.name}`, exact: true });
  await remove.waitFor();
  await signed.waitForFunction(() => !document.querySelector('.save-button')?.disabled);
  const deletion = signed.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes('/api/me/saved/'));
  await remove.click();
  assert.equal((await deletion).status(), 204);
  assert.equal(saved.size, 0);
  assert.deepEqual(writes, ['PUT', 'DELETE']);
  await account.close();
  assert.deepEqual(errors, []);
  console.log('PASS: scholarship search, combined filters, legacy links, keyboard details, guest and authenticated saves, 4 viewport sizes; screenshots in .tools/qa/scholarships');
} finally {
  await browser.close();
}
