import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ channel: process.env.EDUPLAN_BROWSER_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const errors = [], requests = [];
page.on('pageerror', error => errors.push(error.message));
const program = { sourceId:'upr9-nkiz:ux', code:'3079', name:'Ingeniería de Sistemas', nameOrigin:'SNIES_NAME', reviewRequired:false,
  institutionName:'Universidad de prueba', municipality:'Bogotá, D.C.', department:'Bogotá, D.C.',
  academicLevel:'Pregrado', modality:'Presencial', awardedTitle:'Ingeniero de Sistemas', knowledgeArea:'Sistemas' };
await page.route('**/api/programs/filters', route => route.fulfill({ json: { data: {
  academicLevels:['Pregrado','Posgrado'], knowledgeAreas:['Sistemas'], modalities:['Presencial','Virtual'],
  institutions:[{code:'1701',name:'Universidad de prueba'}],
} } }));
await page.route('**/api/programs/suggestions?**', route => {
  const q = new URL(route.request().url()).searchParams.get('q');
  return q === 'fallo' ? route.fulfill({status:503,json:{error:true}})
    : route.fulfill({json:{data:q === 'ninguna' ? [] : ['Ingeniería de Sistemas','Ingeniería de Sistemas y Computación']}});
});
await page.route('**/api/programs?**', route => {
  requests.push(new URL(route.request().url()).searchParams);
  return route.fulfill({json:{data:[program]}});
});
const out = fileURLToPath(new URL('../../.tools/qa/program-search-ux/', import.meta.url));
await mkdir(out, {recursive:true});
try {
  await page.goto(base + '/programas');
  await page.getByRole('heading',{name:program.name,exact:true}).waitFor();
  assert.equal(await page.getByLabel('Ciudad o municipio',{exact:true}).isDisabled(),true);
  assert.equal(await page.getByLabel('Departamento',{exact:true}).inputValue(),'');
  assert.equal(await page.getByRole('checkbox',{name:'Virtual',exact:true}).isVisible(),true);
  assert.equal(await page.getByLabel('Universidad o institución',{exact:true}).isVisible(),false);
  assert.equal(await page.getByLabel('Área de conocimiento',{exact:true}).isVisible(),false);
  const career = page.getByRole('combobox',{name:'Carrera',exact:true});
  await career.fill('sistemas');
  await page.getByRole('option',{name:'Ingeniería de Sistemas',exact:true}).waitFor();
  await career.press('ArrowDown'); await career.press('Enter');
  await page.waitForFunction(() => new URL(location.href).searchParams.get('q') === 'Ingeniería de Sistemas');
  assert.equal(await career.getAttribute('aria-expanded'),'false');
  await page.getByLabel('Departamento',{exact:true}).selectOption('Antioquia');
  await page.getByLabel('Ciudad o municipio',{exact:true}).selectOption('Medellín');
  await page.waitForResponse(response => response.url().includes('/api/programs?') && new URL(response.url()).searchParams.get('municipality') === 'Medellín');
  assert.equal(requests.at(-1).get('department'),'Antioquia');
  await page.getByLabel('Departamento',{exact:true}).selectOption('Valle del Cauca');
  await page.waitForFunction(() => document.querySelector('#program-city').value === '' && !new URL(location.href).searchParams.has('city'));
  assert.equal(await page.getByLabel('Ciudad o municipio',{exact:true}).inputValue(),'');
  assert.equal(new URL(page.url()).searchParams.has('city'),false);
  await page.getByLabel('Ciudad o municipio',{exact:true}).selectOption('Santiago de Cali');
  await page.getByLabel('Nivel académico',{exact:true}).selectOption('Pregrado');
  await page.getByRole('checkbox',{name:'Virtual',exact:true}).check();
  await page.getByLabel('Ordenar por',{exact:true}).selectOption('institution-asc');
  await page.waitForResponse(response => response.url().includes('/api/programs?') && new URL(response.url()).searchParams.get('order') === 'institution-asc');
  assert.equal(requests.at(-1).get('municipality'),'Santiago de Cali');
  assert.equal(requests.at(-1).get('modality'),'Virtual');
  await page.reload();
  await page.getByRole('heading',{name:program.name,exact:true}).waitFor();
  assert.equal(await page.getByLabel('Ciudad o municipio',{exact:true}).inputValue(),'Santiago de Cali');
  assert.equal(await page.getByLabel('Ordenar por',{exact:true}).inputValue(),'institution-asc');
  await page.locator('.program-more-filters summary').click();
  assert.equal(await page.getByLabel('Universidad o institución',{exact:true}).isVisible(),true);
  await page.getByLabel('Universidad o institución',{exact:true}).fill('prueba');
  await page.getByRole('option').filter({hasText:'Universidad de prueba'}).click();
  await page.getByLabel('Área de conocimiento',{exact:true}).selectOption('Sistemas');
  await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();
  await page.waitForFunction(() => location.search === '');
  assert.equal(new URL(page.url()).search,'');
  assert.equal(await page.getByLabel('Ciudad o municipio',{exact:true}).isDisabled(),true);
  await career.fill('ninguna');
  await page.getByText('Sin sugerencias. Puedes buscar con el texto que escribiste.',{exact:true}).waitFor();
  await career.press('Escape');
  assert.equal(await career.inputValue(),'ninguna');
  await career.fill('fallo');
  await page.getByText('Las sugerencias no están disponibles. Puedes seguir buscando.',{exact:true}).waitFor();
  await career.press('Escape');
  await career.fill('sistemas');
  await page.getByRole('option',{name:'Ingeniería de Sistemas y Computación',exact:true}).click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('q') === 'Ingeniería de Sistemas y Computación');
  assert.equal(await career.inputValue(),'Ingeniería de Sistemas y Computación');
  await page.getByRole('heading',{name:program.name,exact:true}).waitFor();
  const card = page.locator('.program-card').first();
  assert.deepEqual(await card.locator('.program-key-details span').allTextContents(),['Bogotá, D.C.','Presencial','Pregrado']);
  assert.equal(await card.getByText('Ingeniero de Sistemas',{exact:true}).isVisible(),false);
  await card.locator('.program-card-details summary').click();
  assert.equal(await card.locator('.program-title').isVisible(),true);
  assert.equal(await card.getByRole('link',{name:'Ver programa',exact:true}).count(),1);
  for (const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`Overflow at ${width}px`);
    await page.screenshot({path:`${out}/${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',checked:['keyboard and pointer suggestions','empty and failed suggestions','dependent city selection','URL restoration','advanced filters','university ordering','card hierarchy'],widths:[1440,1024,768,390]}));
} finally { await browser.close(); }
