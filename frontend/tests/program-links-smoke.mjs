// Current phase exposes institution websites; curated program URL lookup is inactive.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}), page=await browser.newPage();
const base=process.env.EDUPLAN_TEST_URL || 'http://127.0.0.1:5173';
const sourceId='upr9-nkiz:row-links-test', requests=[], errors=[];
page.on('request',request=>requests.push(request.url()));page.on('pageerror',error=>errors.push(error.message));
let state='named';
const program={sourceId,code:'11',institutionCode:'1813',institutionName:'Universidad de los Andes',institutionWebsite:'www.uniandes.edu.co',name:'ARQUITECTURA',rawName:'Bogotá D.C.',awardedTitle:'ARQUITECTO',academicLevel:'Pregrado',municipality:'Bogotá D.C.',modality:'Presencial',nameOrigin:'SNIES_NAME',reviewRequired:false};
await page.route('**/api/programs/11',route=>route.fulfill({json:{data:[{...program,...(state==='unavailable'?{name:'ARQUITECTO',nameOrigin:'UNAVAILABLE',reviewRequired:true}:{}),...(state==='offline'?{institutionWebsite:'',institutionEnrichmentUnavailable:true}:{}),...(state==='missing-site'?{institutionWebsite:''}:{})}]}}));
try {
  await page.goto(base+'/programas/11?registro='+encodeURIComponent(sourceId));
  await page.getByRole('heading',{level:1,name:'ARQUITECTURA',exact:true}).waitFor();
  const link=page.locator('.institution-official-actions').getByRole('link',{name:'Sitio oficial de la institución ↗'});
  assert.equal(await link.getAttribute('href'),'https://www.uniandes.edu.co/');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
  assert.match(await page.locator('.program-hero').innerText(),/Título otorgado: ARQUITECTO/);
  assert.equal(await page.locator('.institution-official-actions').getByRole('link',{name:'Ver institución',exact:true}).getAttribute('href'),'/instituciones/1813');
  state='unavailable';await page.reload();await page.getByRole('heading',{level:1,name:'Nombre del programa no disponible'}).waitFor();assert.equal(await page.getByRole('heading',{name:'ARQUITECTO',exact:true}).count(),0);
  state='missing-site';await page.reload();await page.getByText('Sitio web institucional no disponible en el catálogo.',{exact:true}).waitFor();assert.equal(await page.locator('.institution-official-actions a[target="_blank"]').count(),0);
  state='offline';await page.reload();await page.getByRole('button',{name:'Reintentar consulta'}).waitFor();state='named';await page.getByRole('button',{name:'Reintentar consulta'}).click();await link.waitFor();
  assert(!requests.some(url=>url.includes('/api/program-links')));assert.deepEqual(errors,[]);
  console.log('PASS: academic name/title separation, exact institution URL, safe external link, unavailable name, missing website, catalog retry; no program URL lookup.');
} finally { await browser.close(); }
