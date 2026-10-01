// Deterministic UI contracts; fixture data is confined to this browser test.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH||'playwright');
const base=process.env.EDUPLAN_TEST_URL||'http://localhost:3005';
const out=fileURLToPath(new URL('../../.tools/qa/profile-redesign/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext(),page=await context.newPage();
const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
let preferences={academicLevel:'Pregrado',modality:'Presencial',mobility:'CITY',department:'Antioquia',municipality:'Medellín'};
let interests={areas:['Tecnología'],motivations:['Investigar'],updatedAt:null};
let account={userId:42,name:'Sebastián Ramírez',email:'profile@example.test',phone:'3001234567'};
let failInterests=false,failPreferences=false,failRecommendations=false;const saved=new Map();
await context.addInitScript(()=>{if(!sessionStorage.getItem('eduplan-session-v1'))sessionStorage.setItem('eduplan-session-v1',JSON.stringify({token:'fixture-token',user:{id:42,name:'Sebastián Ramírez',email:'profile@example.test',phone:'3001234567'},expiresAt:Date.now()+3600000}));});
await context.route('**/api/me/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,put=request.method()==='PUT';
  if(path.endsWith('/preferences')) {if(put&&failPreferences)return route.fulfill({status:503,json:{}});if(put)preferences=request.postDataJSON();return route.fulfill({json:preferences});}
  if(path.endsWith('/interests')) {if(put&&failInterests)return route.fulfill({status:503,json:{}});if(put)interests={...request.postDataJSON(),updatedAt:new Date().toISOString()};return route.fulfill({json:interests});}
  if(path.endsWith('/account')) {if(put)account={...account,...request.postDataJSON()};return route.fulfill({json:account});}
  if(path.startsWith('/api/me/saved/')){const id=decodeURIComponent(path.split('/').pop());if(request.method()==='DELETE'){saved.delete(id);return route.fulfill({status:204});}if(put){const item={id,...request.postDataJSON(),savedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};saved.set(id,item);return route.fulfill({json:item});}}
  return route.fulfill({json:{data:[...saved.values()]}});
});
await context.route('**/api/recommendations',route=>{
  if(failRecommendations)return route.fulfill({status:503,json:{}});
  return route.fulfill({json:{status:'OK',data:[0,1].map(n=>({score:85,reasons:[],matchedCriteria:[],unmatchedCriteria:[],missingInformation:[],program:{sourceId:'upr9-nkiz:profile-fixture-'+n,code:String(900+n),name:n?'DISEÑO DIGITAL':'INGENIERÍA DE SISTEMAS',institutionCode:'42',institutionName:'Universidad de prueba',academicLevel:'Pregrado',educationLevel:'Universitaria',modality:'Presencial',municipality:'Medellín',department:'Antioquia',status:'Activo',nameOrigin:'SNIES_NAME',reviewRequired:false}}))}});
});
async function ready(){await page.getByLabel('Nivel de formación').waitFor();await page.getByRole('button',{name:'Tecnología',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.academic-steps')?.disabled);}
async function save(){await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();await page.getByText('Tu perfil académico está guardado. Ya puedes explorar tus recomendaciones.',{exact:true}).waitFor();}
try{
  await page.goto(base+'/perfil');await ready();
  assert.deepEqual(await page.getByRole('tab').allTextContents(),['Perfil académico','Orientación','Resultados','Cuenta']);
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'100');
  const preview=page.locator('.preview-program').first();await preview.waitFor();const bookmarkWrite=page.waitForResponse(r=>r.url().includes('/api/me/saved/')&&r.request().method()==='PUT');await preview.getByRole('button',{name:'Guardar INGENIERÍA DE SISTEMAS',exact:true}).click();assert.equal((await bookmarkWrite).status(),200);await preview.getByRole('button',{name:'Quitar de guardados INGENIERÍA DE SISTEMAS',exact:true}).waitFor();assert.equal(saved.size,1);
  const buttonBounds=await preview.getByRole('button').boundingBox(),cardBounds=await preview.boundingBox();assert(buttonBounds.x+buttonBounds.width<=cardBounds.x+cardBounds.width);assert(buttonBounds.height>=44);
  await page.getByLabel('Departamento',{exact:true}).selectOption('Cundinamarca');assert.equal(await page.getByLabel('Ciudad o municipio').inputValue(),'');
  assert.equal(await page.getByLabel('Ciudad o municipio').locator('option').filter({hasText:'Medellín'}).count(),0);
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'83');
  await page.getByLabel('Ciudad o municipio').selectOption('Chía');await page.getByRole('button',{name:'Salud',exact:true}).click();await save();
  await page.reload();await ready();assert.equal(await page.getByLabel('Ciudad o municipio').inputValue(),'Chía');assert.equal(await page.getByRole('button',{name:'Salud',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByLabel('Cobertura geográfica').selectOption('DEPARTMENT');assert.equal(await page.getByLabel('Ciudad o municipio').count(),0);await save();assert.equal(preferences.municipality,'');
  await page.getByLabel('Cobertura geográfica').selectOption('ANY');assert.equal(await page.getByLabel('Departamento',{exact:true}).count(),0);await save();assert.equal(preferences.department,'');
  // Partial writes remain honest and retry the pending interests.
  failInterests=true;await page.getByLabel('Modalidad de estudio').selectOption('Virtual');await page.getByRole('button',{name:'Artes',exact:true}).click();await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Los intereses siguen pendientes'}).waitFor();assert.equal(preferences.modality,'Virtual');assert(!interests.areas.includes('Artes'));
  failInterests=false;await save();assert(interests.areas.includes('Artes'));
  failPreferences=true;await page.getByLabel('Modalidad de estudio').selectOption('Presencial');await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();await page.getByRole('alert').filter({hasText:'Tus cambios siguen aquí'}).waitFor();assert.equal(await page.getByLabel('Modalidad de estudio').inputValue(),'Presencial');failPreferences=false;await save();
  for(const alias of ['perfil','preferencias','intereses']) {await page.goto(base+'/perfil?seccion='+alias);await ready();assert.equal(await page.getByRole('tab',{name:'Perfil académico',exact:true}).getAttribute('aria-selected'),'true');}
  await page.getByRole('tab',{name:'Perfil académico',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.getByRole('heading',{name:'Descubre qué mueve tu curiosidad'}).waitFor();assert(await page.getByRole('button',{name:'Test disponible próximamente'}).isDisabled());
  assert(!requests.some(url=>/aptitude|orientation|orientacion|test-/.test(url)));
  await page.getByRole('tab',{name:'Resultados',exact:true}).click();assert.equal(await page.getByRole('link',{name:'Ver mis recomendaciones'}).getAttribute('href'),'/recomendaciones');
  await page.getByRole('tab',{name:'Cuenta',exact:true}).click();await page.getByLabel('Nombre completo').fill('Sebastián Perfil');await page.getByLabel('Teléfono').fill('3017654321');assert(await page.getByLabel('Correo de acceso').evaluate(el=>el.readOnly));
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Tus datos están guardados.',{exact:true}).waitFor();await page.reload();await page.getByLabel('Nombre completo').waitFor();assert.equal(await page.getByLabel('Nombre completo').inputValue(),'Sebastián Perfil');assert.equal(await page.getByLabel('Teléfono').inputValue(),'3017654321');
  const widths=[375,390,430,768,1366,1440],sections=['academico','orientacion','resultados','cuenta'];let checked=0;
  for(const width of widths){await page.setViewportSize({width,height:900});for(const section of sections){
    await page.goto(base+'/perfil?seccion='+section);if(section==='academico'){await ready();await page.locator('.preview-program').first().waitFor({state:width<=800?'attached':'visible'});}else await page.locator('main h1').waitFor();
    if(section==='cuenta')await page.getByLabel('Nombre completo').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${section} overflow at ${width}`);
    const tabs=await page.getByRole('tab').all();for(const tab of tabs){const b=await tab.boundingBox();assert(b.x>=0&&b.x+b.width<=width);}
    if(section==='academico'){const main=await page.locator('.academic-profile-main').boundingBox(),aside=await page.locator('.academic-profile-aside').boundingBox();assert(width<=800?aside.y<main.y:aside.x>main.x);}
    await page.screenshot({path:out+section+'-'+width+'.png',fullPage:true});checked++;
  }}
  // A preview failure must not block editing.
  failRecommendations=true;await page.goto(base+'/perfil');await ready();await page.getByText('No pudimos cargar tus opciones ahora.').waitFor();assert(await page.getByLabel('Nivel de formación').isEnabled());
  failRecommendations=false;await page.getByRole('button',{name:'Volver a intentar',exact:true}).click();await page.locator('.preview-program').first().waitFor();
  assert.deepEqual(errors,[]);await writeFile(out+'report.json',JSON.stringify({widths,sections,checked,errors,checks:['location dependencies','all coverage modes','persist/reload','partial write retry','failed preference retry','legacy aliases','keyboard tabs','upcoming CTA','results link','account persistence','preview retry']},null,2));
  console.log(`PASS: profile dependencies, partial writes/retries, persistence, aliases, account, keyboard and ${checked} views at six widths.`);
}catch(error){
  await page.screenshot({path:out+'failure.png',fullPage:true});
  console.error(await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,class:el.className,right:Math.round(el.getBoundingClientRect().right)})).slice(0,15)));
  throw error;
}finally{await browser.close();}
