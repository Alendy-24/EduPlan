import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const browser = await chromium.launch({ channel: process.env.EDUPLAN_BROWSER_CHANNEL || 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(45000);
const errors = []; page.on('pageerror', error => errors.push(error.message));
const out = fileURLToPath(new URL('../../.tools/qa/program-filters/', import.meta.url));
await mkdir(out, { recursive: true });
function responseFor(values) { return page.waitForResponse(response => response.url().includes('/api/programs?') && Object.entries(values).every(([key, value]) => new URL(response.url()).searchParams.get(key) === value)); }
async function rendered(response) {
  assert.equal(response.status(), 200);
  const payload = await response.json();
  await page.waitForFunction(count => !document.querySelector('.async-state[role=status]') && document.querySelectorAll('.list-item').length === count, payload.data.length);
  return payload.data;
}
try {
  const firstResponse = responseFor({ name: 'ingenieria de sistemas', academicLevel: 'Pregrado', institutionCode: '1101' });
  await page.goto(base + '/programas?q=ingenieria+de+sistemas&level=Pregrado&institution=1101');
  const initial = await rendered(await firstResponse);
  assert(initial.length > 0 && initial.every(program => program.academicLevel === 'Pregrado' && program.institutionCode === '1101'));
  await page.waitForFunction(() => document.querySelector('#program-university')?.value.includes('NACIONAL'));
  assert.equal(await page.getByLabel('Nivel académico', { exact: true }).inputValue(), 'Pregrado');
  assert.equal(await page.getByLabel('Área de conocimiento', { exact: true }).isVisible(), true);
  const area = 'Ingeniería de sistemas telemática y afines';
  const areaResponse = responseFor({ knowledgeArea: area });
  await page.getByLabel('Área de conocimiento', { exact: true }).selectOption(area);
  const areaRows = await rendered(await areaResponse);
  assert(areaRows.every(program => program.knowledgeArea === area));
  const universityResponse = responseFor({ name: 'ingenieria de sistemas', academicLevel: 'Pregrado', knowledgeArea: area });
  await page.getByRole('button', { name: /^Quitar filtro Universidad:/ }).click();
  const universityRows = await rendered(await universityResponse);
  assert.equal(await page.getByLabel('Universidad o institución', { exact: true }).inputValue(), '');
  assert.equal(new URL(page.url()).searchParams.has('institution'), false);
  const sortedResponse = responseFor({ order: 'asc', page: '1' });
  await page.getByLabel('Ordenar por', { exact: true }).selectOption('asc');
  const sortedRows = await rendered(await sortedResponse);
  assert(sortedRows.length > 0 && sortedRows.every(program => program.academicLevel === 'Pregrado' && program.knowledgeArea === area));
  assert.equal(await page.getByText('Las cantidades corresponden a ofertas de todo el catálogo. Sedes y modalidades distintas se muestran por separado.', { exact: true }).count(), 1);
  if (sortedRows.length === 12) {
    const moreResponse = responseFor({ order: 'asc', page: '2' });
    await page.getByRole('button', { name: 'Cargar más programas', exact: true }).click();
    const response = await moreResponse; assert.equal(response.status(), 200);
    const nextRows = (await response.json()).data;
    assert(nextRows.every(program => program.academicLevel === 'Pregrado' && program.knowledgeArea === area));
    assert.equal(new Set([...sortedRows, ...nextRows].map(program => program.sourceId)).size, sortedRows.length + nextRows.length);
    await page.waitForFunction(count => document.querySelectorAll('.list-item').length === count, sortedRows.length + nextRows.length);
  }
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${out}/${width}.png`, fullPage: true });
  }
  const reloadResponse = responseFor({ academicLevel: 'Pregrado', knowledgeArea: area, order: 'asc', page: '1' });
  await page.reload(); await rendered(await reloadResponse);
  assert.equal(await page.getByLabel('Nivel académico', { exact: true }).inputValue(), 'Pregrado');
  assert.equal(await page.getByLabel('Área de conocimiento', { exact: true }).inputValue(), area);
  const institutionResponse = responseFor({ institutionCode: '1101' });
  await page.goto(base + '/instituciones/1101/programas'); await rendered(await institutionResponse);
  await page.getByText('Universidad o institución:', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Universidad o institución', { exact: true }).count(), 0);
  await page.goto(base + '/instituciones/demo-javeriana/programas');
  await page.getByText('Demostración con datos ficticios. No representa una oferta académica verificada.', { exact: true }).waitFor();
  assert((await page.locator('.list-item').count()) > 0);
  const fixture = await browser.newPage(); fixture.setDefaultTimeout(15000);
  let optionsUnavailable = true;
  await fixture.route('**/api/programs/filters', route => optionsUnavailable ? route.fulfill({ status: 503, json: { message: 'No disponible' } }) : route.fulfill({ json: { data: { academicLevels: ['Pregrado'], knowledgeAreas: [area], modalities: ['Presencial'], institutions: [{ code: '1101', name: 'Universidad oficial de prueba' }] } } }));
  await fixture.route('**/api/programs?**', route => route.fulfill({ json: { data: [] } }));
  await fixture.goto(base + '/programas');
  await fixture.getByRole('button', { name: 'Reintentar filtros', exact: true }).waitFor();
  optionsUnavailable = false;
  await fixture.getByRole('button', { name: 'Reintentar filtros', exact: true }).click();
  await fixture.getByText('Cargando filtros del catálogo…', { exact: true }).waitFor({ state: 'hidden' });
  await fixture.getByRole('button', { name: 'Reintentar filtros', exact: true }).waitFor({ state: 'hidden' });
  await fixture.locator('.program-more-filters summary').click();
  const universityInput = fixture.getByLabel('Universidad o institución', { exact: true });
  await universityInput.fill('oficial');
  await fixture.getByRole('option').filter({ hasText:'Código 1101' }).waitFor();
  await universityInput.press('ArrowDown');
  await universityInput.press('Enter');
  assert.equal(new URL(fixture.url()).searchParams.get('institution'), '1101');
  await fixture.waitForFunction(() => document.querySelector('#program-university')?.value.includes('Código 1101'));
  await universityInput.fill('sin coincidencias');
  await fixture.getByText('No hay instituciones con ese nombre o código.', { exact: true }).waitFor();
  await universityInput.press('Escape');
  assert.equal(await universityInput.inputValue(), 'Universidad oficial de prueba — Código 1101');
  await universityInput.fill('1101');
  await fixture.getByRole('option').filter({ hasText:'Código 1101' }).click();
  await universityInput.fill('');
  assert.equal(new URL(fixture.url()).searchParams.has('institution'), false);
  assert.equal(await fixture.getByRole('button', { name: 'Reintentar filtros', exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'PASS', realInitialRows: initial.length, afterArea: areaRows.length, afterRemovingUniversity: universityRows.length, sortedRows: sortedRows.length, widths: [1440, 1024, 768, 390], checked: ['global filters', 'university code', 'URL reload', 'pagination', 'fixed institution', 'demo isolated', 'options retry'] }));
} finally { await browser.close(); }
