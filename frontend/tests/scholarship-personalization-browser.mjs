// Explicit API fixtures test the UI contract; backend authorization is tested with isolated PostgreSQL.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { scholarships } from '../src/data/scholarships.js';
import { recommendScholarships } from '../src/services/scholarship-recommendations.js';
import { emptyFinancingPreferences, validFinancingPreferences } from '../src/utils/financing.js';
import { emptyRefinement } from '../src/utils/matching.js';

const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const out = fileURLToPath(new URL('../../.tools/qa/scholarships-phase2/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], writes = [], accounts = new Map([
  ['finance-fixture-a', { financing: { ...emptyFinancingPreferences }, saved: new Map() }],
  ['finance-fixture-b', { financing: { ...emptyFinancingPreferences }, saved: new Map() }],
]);
const preferences = { academicLevel: 'Pregrado', educationLevel: '', modality: '', municipality: 'Bogotá D.C.', department: 'Bogotá D.C.', mobility: 'CITY' };
const interests = { areas: [], motivations: [], updatedAt: null };
let expire = false, failFinance = false;
try {
  const guest = await browser.newContext(), publicPage = await guest.newPage();
  publicPage.on('pageerror', error => errors.push(error.message));
  await publicPage.goto(`${base}/becas?forYou=yes`);
  await publicPage.locator('.scholarship-card').first().waitFor();
  assert.equal(await publicPage.getByRole('button', { name: 'Para ti', exact: true }).count(), 0);
  assert(await publicPage.getByText('El catálogo es público.', { exact: false }).isVisible());
  await guest.close();

  const context = await browser.newContext();
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('eduplan-session-v1')) sessionStorage.setItem('eduplan-session-v1', JSON.stringify({ token: 'finance-fixture-a', user: { id: 6101, name: 'Prueba Apoyo', email: 'funding@example.test' }, expiresAt: Date.now() + 3600000 }));
  });
  await context.route('**/api/me/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const token = (request.headers().authorization || '').replace(/^Bearer /, ''), owner = accounts.get(token);
    if (expire || !owner) return route.fulfill({ status: 401, json: {} });
    if (path.endsWith('/financing-preferences')) {
      if (failFinance) return route.fulfill({ status: 503, json: {} });
      if (request.method() === 'PUT') { const value = request.postDataJSON(); assert(validFinancingPreferences(value)); owner.financing = value; writes.push({ token, value }); }
      return route.fulfill({ json: owner.financing });
    }
    if (path.endsWith('/preferences')) return route.fulfill({ json: preferences });
    if (path.endsWith('/interests')) return route.fulfill({ json: interests });
    if (path.endsWith('/matching-preferences')) return route.fulfill({ json: emptyRefinement });
    if (path.endsWith('/account')) return route.fulfill({ json: { userId: token.endsWith('-a') ? 6101 : 6102, name: 'Prueba Apoyo', email: 'funding@example.test', phone: null } });
    if (path === '/api/me/saved') return route.fulfill({ json: { data: [...owner.saved.values()] } });
    if (path.startsWith('/api/me/saved/')) {
      const id = decodeURIComponent(path.split('/').at(-1));
      if (request.method() === 'DELETE') { owner.saved.delete(id); return route.fulfill({ status: 204 }); }
      const value = { id, ...request.postDataJSON(), savedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      owner.saved.set(id, value); return route.fulfill({ json: value });
    }
    throw new Error(`Unexpected fixture request ${path}`);
  });
  await context.route('**/api/recommendations', route => {
    assert(!('financing' in route.request().postDataJSON()), 'Funding answers must not leak into public catalog requests');
    return route.fulfill({ json: { data: [], status: 'INCOMPLETE_PROFILE' } });
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/perfil#apoyo`);
  await page.getByRole('heading', { name: 'Apoyo para tus estudios', exact: true }).waitFor();
  await page.locator('#finance-studentStage').waitFor();
  for (const [field, value] of Object.entries({ studentStage: 'entry', support: 'tuition', repayment: 'no', international: 'no', admission: 'yes', nationality: 'Colombianos' })) await page.locator(`#finance-${field}`).selectOption(value);
  await page.getByRole('button', { name: 'Guardar preferencias de apoyo', exact: true }).click();
  await page.getByText('Preferencias de financiación guardadas.', { exact: false }).waitFor();
  assert.equal(writes.length, 1);
  await page.reload(); await page.locator('#finance-support').waitFor(); assert.equal(await page.locator('#finance-support').inputValue(), 'tuition');
  const privateKeys = await page.evaluate(() => Object.keys(localStorage).filter(key => /financ|funding/i.test(key)));
  assert.deepEqual(privateKeys, []);

  async function checkAgreement() {
    const expected = recommendScholarships(scholarships, { preferences, interests, refinement: emptyRefinement, financing: accounts.get('finance-fixture-a').financing }).recommendations.map(row => row.item.id);
    await page.goto(`${base}/dashboard`);
    await page.locator('.scholarship-recommendation').first().waitFor();
    const dashboard = await page.locator('.scholarship-recommendation h3 a').evaluateAll(links => links.map(link => new URL(link.href).searchParams.get('opportunity')));
    assert.deepEqual(dashboard, expected.slice(0, 3));
    await page.goto(`${base}/becas?forYou=yes`);
    await page.locator('.scholarship-card').first().waitFor();
    const cards = await page.locator('.scholarship-card').evaluateAll(nodes => nodes.map(node => node.id));
    assert.deepEqual(cards, expected.slice(0, 12));
    await page.getByLabel(/^Ordenar/).selectOption('current');
    assert.deepEqual(await page.locator('.scholarship-card').evaluateAll(nodes => nodes.map(node => node.id)), expected.slice(0, 12));
    return expected;
  }
  const before = await checkAgreement();
  const firstCard = page.locator('.scholarship-card').first();
  const savedResponse = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().includes('/api/me/saved/'));
  await firstCard.locator('.save-button').click();
  assert.equal((await savedResponse).status(), 200);
  await page.reload(); await page.locator('.save-button[aria-pressed=true]').first().waitFor();
  await page.locator('.save-button[aria-pressed=true]').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.save-button[aria-pressed=true]').length === 0);
  await page.goto(`${base}/perfil#apoyo`); await page.locator('#finance-support').waitFor();
  await page.locator('#finance-support').selectOption('living');
  await page.getByRole('button', { name: 'Guardar preferencias de apoyo', exact: true }).click();
  await page.getByText('Preferencias de financiación guardadas.', { exact: false }).waitFor();
  const after = await checkAgreement(); assert.notDeepEqual(after, before);

  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/perfil#apoyo', '/dashboard', '/becas?forYou=yes']) {
      await page.goto(base + path); await page.locator('main').waitFor();
      if (path.startsWith('/perfil')) await page.locator('#finance-support').waitFor();
      if (path.startsWith('/dashboard')) await page.locator('.scholarship-recommendation').first().waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflow at ${width}`);
      if ([1440, 390].includes(width)) await page.screenshot({ path: `${out}/personal-${path.split(/[?#]/)[0].slice(1)}-${width}.png`, fullPage: true });
    }
  }
  await page.evaluate(() => sessionStorage.setItem('eduplan-session-v1', JSON.stringify({ token: 'finance-fixture-b', user: { id: 6102, name: 'Otra cuenta', email: 'second@example.test' }, expiresAt: Date.now() + 3600000 })));
  await page.goto(`${base}/perfil#apoyo`); await page.reload(); await page.locator('#finance-support').waitFor();
  assert.equal(await page.locator('#finance-support').inputValue(), '');
  assert.equal(accounts.get('finance-fixture-a').financing.support, 'living');
  failFinance = true; await page.reload();
  await page.getByRole('button', { name: 'Reintentar preferencias de financiación' }).waitFor();
  assert(await page.getByRole('heading', { name: 'Tu perfil académico', exact: true }).isVisible());
  failFinance = false; await page.getByRole('button', { name: 'Reintentar preferencias de financiación' }).click(); await page.locator('#finance-support').waitFor();
  expire = true; await page.reload(); await page.waitForURL(url => url.pathname === '/login');
  assert.deepEqual(errors, []);
  console.log('PASS: optional financing save/reload, per-account isolation, unauthorized session, finance failure isolation, recommendation agreement dashboard/catalog, updates, saves, public guest catalog, four viewport sizes');
  await context.close();
} finally { await browser.close(); }
