import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.EDUPLAN_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
const query = 'ingenieria de sistemas';
const tier = { EXACT_NAME_OR_TITLE: 0, SIMILAR_NAME_OR_TITLE: 1, KNOWLEDGE_AREA: 2 };
try {
  await page.goto(`${base}/programas?q=${encodeURIComponent(query)}`);
  await page.locator('.list-item').first().waitFor();
  let names = await page.locator('.list-item h3').allTextContents();
  assert.equal(names.length, 12);
  assert.equal(names[0], 'INGENIERIA DE SISTEMAS');
  assert.equal(names[1], 'INGENIERIA DE SISTEMAS');
  assert(names[2].includes('INGENIERO'));
  assert(names.every(name => !name.includes('DOCTOR EN')));
  assert.equal(await page.getByLabel('Ordenar por', { exact: true }).inputValue(), 'source');
  assert.equal(await page.locator('option[value="source"]').textContent(), 'Relevancia de búsqueda');
  await page.getByRole('button', { name: 'Cargar más programas' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 24);
  names = await page.locator('.list-item h3').allTextContents();
  assert.equal(names[0], 'INGENIERIA DE SISTEMAS');
  // Read every real page, ensuring area-only rows never precede a name/title match.
  const identities = new Set(); let previous = -1, total = 0, areaOnly = 0;
  for (let number = 1; ; number++) {
    assert(number <= 100, 'Unexpectedly large catalog response');
    const response = await page.request.get(`${base}/api/programs?${new URLSearchParams({ name: query, page: String(number), limit: '100' })}`);
    assert.equal(response.status(), 200);
    const { data } = await response.json();
    for (const program of data) {
      assert(!identities.has(program.sourceId)); identities.add(program.sourceId);
      assert(tier[program.searchMatch] >= previous, 'Relevance moved backwards across pages');
      previous = tier[program.searchMatch]; total++;
      if (program.searchMatch === 'KNOWLEDGE_AREA') areaOnly++;
    }
    if (data.length < 100) break;
  }
  assert(areaOnly > 0);
  const out = fileURLToPath(new URL('../../.tools/qa/programs-relevance/', import.meta.url));
  await mkdir(out, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${out}/${width}.png`, fullPage: true });
  }
  // A fixture verifies the explicit explanation for an area-only match.
  await page.route('**/api/programs?**', route => route.fulfill({ json: { data: [{
    sourceId: 'upr9-nkiz:area-fixture', code: '11', name: 'DOCTOR EN INGENIERIA',
    rawName: 'Bogotá D.C.', awardedTitle: 'DOCTOR EN INGENIERIA', nameOrigin: 'AWARDED_TITLE',
    reviewRequired: true, institutionName: 'Institución de prueba', academicLevel: 'Posgrado',
    knowledgeArea: 'Ingeniería de sistemas telemática y afines', searchMatch: 'KNOWLEDGE_AREA',
  }] } }));
  await page.reload();
  await page.getByText('Coincidencia solo por área de conocimiento.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(`PASS: exact names first; ${total} real rows ordered across pages, ${areaOnly} area-only rows last; load more, explanation, desktop/mobile`);
} finally { await browser.close(); }
