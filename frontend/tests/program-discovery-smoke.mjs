import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { searchProgramOffers, groupProgramOffers } from '../../data-integration/dist/services/program-catalog.js';
import { suggestProgramNames } from '../../data-integration/dist/services/snies-names.js';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({channel:process.env.EDUPLAN_BROWSER_CHANNEL || 'chrome',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const errors=[]; page.on('pageerror',error=>errors.push(error.message));
const template={rawName:'Bogotá D.C.',awardedTitle:'Psicólogo',knowledgeArea:'Psicología',credits:'160',nameOrigin:'SNIES_NAME',reviewRequired:false,
  name:'Psicología',academicLevel:'Pregrado',educationLevel:'Universitaria',modality:'Presencial',periodCount:'8',periodicity:'Semestral',status:'Activo',
  department:'Bogotá D.C.',municipality:'Bogotá D.C.',institutionCode:'1701',institutionName:'Universidad Alfa',code:'11',sniesCode:'100',sourceId:'upr9-nkiz:a'};
const records=[template,{...template,sourceId:'upr9-nkiz:z'},
  {...template,sourceId:'upr9-nkiz:b',sniesCode:'200',code:'12',institutionCode:'1702',institutionName:'Universidad Beta',department:'Antioquia',municipality:'Medellín'},
  {...template,sourceId:'upr9-nkiz:c',sniesCode:'300',code:'13',institutionCode:'1703',institutionName:'Universidad Gamma',department:'Antioquia',municipality:'Medellín',modality:'Virtual'},
  {...template,sourceId:'upr9-nkiz:d',sniesCode:'400',code:'14',institutionCode:'1704',institutionName:'Universidad Delta',department:'Antioquia',municipality:'Bello'}];
await page.route('**/api/programs/filters',route=>route.fulfill({json:{data:{academicLevels:['Pregrado'],knowledgeAreas:['Psicología'],modalities:['Presencial','Virtual'],institutions:[...new Map(records.map(r=>[r.institutionCode,{code:r.institutionCode,name:r.institutionName}])).values()]}}}));
await page.route('**/api/programs/suggestions?**',route=>route.fulfill({json:{data:suggestProgramNames(new URL(route.request().url()).searchParams.get('q') || '')}}));
await page.route('**/api/programs?**',route=>{
  const p=new URL(route.request().url()).searchParams;
  const filters=Object.fromEntries(['name','department','municipality','modality','academicLevel','knowledgeArea','institutionCode','order'].map(key=>[key,p.get(key)||'']));
  return route.fulfill({json:searchProgramOffers(records,{...filters,page:Number(p.get('page')),limit:Number(p.get('limit'))})});
});
await page.route(/\/api\/programs\/11(?:\?|$)/,route=>route.fulfill({json:{data:records.filter(r=>r.code==='11').map(r=>({...r,offerId:groupProgramOffers([r])[0].offerId}))}}));
const out=fileURLToPath(new URL('../../.tools/qa/program-discovery/',import.meta.url));
await mkdir(out,{recursive:true});
try {
  await page.goto(base+'/programas');
  await page.getByText('4 ofertas encontradas',{exact:true}).waitFor();
  assert.equal(await page.locator('.program-card').count(),4);
  assert.equal(await page.locator('.program-card .program-institution').filter({hasText:'Universidad Alfa'}).count(),1);
  assert.equal(await page.locator('#program-modality option[value="Presencial"]').textContent(),'Presencial (3)');
  assert.equal(await page.locator('#program-modality option[value="Virtual"]').textContent(),'Virtual (1)');
  const career=page.getByRole('combobox',{name:'Carrera',exact:true});
  await career.fill('psciologia');
  await page.getByRole('option',{name:/^PSICOLOG[IÍ]A$/}).waitFor();
  await career.press('Escape');
  await page.getByText('Nombre similar a lo que escribiste.',{exact:true}).first().waitFor();
  await page.getByText('4 ofertas encontradas',{exact:true}).waitFor();
  await page.getByLabel('Departamento',{exact:true}).selectOption('Antioquia');
  await page.getByText('3 ofertas encontradas',{exact:true}).waitFor();
  await page.getByLabel('Modalidad',{exact:true}).selectOption('Virtual');
  await page.getByText('1 oferta encontrada',{exact:true}).waitFor();
  assert.equal(await page.locator('#program-modality option[value="Presencial"]').textContent(),'Presencial (2)');
  // A persisted incompatible filter remains removable and offers useful recovery actions.
  await page.goto(base+'/programas?q=psciologia&department=Antioquia&city=Bello&modality=Virtual');
  await page.getByRole('heading',{name:'Sin resultados',exact:true}).waitFor();
  await page.getByRole('button',{name:'Buscar en todo el departamento (1)',exact:true}).click();
  await page.getByText('1 oferta encontrada',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('q'),'psciologia');
  assert.equal(new URL(page.url()).searchParams.get('modality'),'Virtual');
  assert.equal(new URL(page.url()).searchParams.has('city'),false);
  await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();
  await page.getByText('4 ofertas encontradas',{exact:true}).waitFor();
  const cards=page.locator('.program-card');
  for (let i=0;i<3;i++) await cards.nth(i).getByRole('button',{name:/^Comparar /}).click();
  const bar=page.getByRole('complementary',{name:'Programas seleccionados para comparar'});
  await bar.getByText('3 de 3 programas seleccionados',{exact:true}).waitFor();
  await bar.locator('summary').click();
  assert.equal(await bar.locator('li').count(),3);
  assert.equal(await cards.nth(3).getByRole('button',{name:/^Comparar /}).isDisabled(),true);
  await bar.locator('li').first().getByRole('button',{name:/^Quitar /}).click();
  await bar.getByText('2 de 3 programas seleccionados',{exact:true}).waitFor();
  assert.equal(await cards.nth(3).getByRole('button',{name:/^Comparar /}).isEnabled(),true);
  await cards.first().getByRole('button',{name:/^Comparar /}).click();
  await bar.getByText('3 de 3 programas seleccionados',{exact:true}).waitFor();
  await page.reload(); await bar.getByText('3 de 3 programas seleccionados',{exact:true}).waitFor();
  // Opening another source row of the same grouped offering cannot add it twice.
  await page.goto(base+'/programas/11?registro=upr9-nkiz%3Az');
  await page.getByRole('heading',{name:'Psicología',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Quitar de comparación Psicología',exact:true}).getAttribute('aria-pressed'),'true');
  await page.goto(base+'/programas'); await page.getByText('4 ofertas encontradas',{exact:true}).waitFor();
  for (const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
    const box=await bar.boundingBox(); assert(box && box.y+box.height<=1001,`Comparison bar hidden at ${width}`);
    await page.screenshot({path:`${out}/${width}.png`,fullPage:true});
    await page.screenshot({path:`${out}/${width}-viewport.png`});
  }
  await bar.getByRole('link',{name:'Comparar 3 programas',exact:true}).click();
  await page.getByRole('heading',{name:'Comparar programas',exact:true}).waitFor();
  await page.goto(base+'/programas');
  await bar.locator('summary').click();
  await bar.getByRole('button',{name:'Limpiar comparación',exact:true}).click();
  await bar.waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',checked:['typo suggestions and results','global counts','duplicate grouping','self-excluding facets','empty recovery','comparison limit and removal','comparison persistence and grouped identity','sticky bar'],widths:[1440,1024,768,390]}));
} finally { await browser.close(); }
