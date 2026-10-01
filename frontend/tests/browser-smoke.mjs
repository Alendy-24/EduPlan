// Browser fixtures test UI behavior only; they are never application fallbacks.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const out = fileURLToPath(new URL('../../.tools/qa/', import.meta.url));
await mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'msedge',headless:true});
const context = await browser.newContext();
const page = await context.newPage();
const errors=[]; page.on('pageerror',error=>errors.push(error.message));
const institution = {code:'1101',name:'Institución de prueba para validación',sector:'Oficial',academicCharacter:'Universidad',municipality:'Bogotá',department:'Bogotá D.C.',website:'www.example.org',modalities:['Presencial']};
const makeRow = n => ({sourceId:`upr9-nkiz:row-${n}`,code:n<2?'5':String(10+n),name:`Programa de prueba ${n}`,institutionCode:'1101',institutionName:institution.name,academicLevel:n%2?'Posgrado':'Pregrado',educationLevel:'Universitaria',knowledgeArea:n%2?'Salud':'Tecnología',modality:'Presencial',municipality:'Bogotá',periodCount:'8',periodicity:'Semestral',status:n%2?'Inactivo':'Activo',nameOrigin:'SNIES_NAME',reviewRequired:false});
const requests=[];
await page.route('**/api/programs**', async route=>{
 const url=new URL(route.request().url());requests.push(url);
 if(url.pathname.endsWith('/filters')) return route.fulfill({json:{data:{academicLevels:['Pregrado','Posgrado'],knowledgeAreas:['Salud','Tecnología'],modalities:['Presencial'],institutions:[{code:institution.code,name:institution.name}]}}});
 if(url.searchParams.get('name')==='error')return route.fulfill({status:502,json:{error:true}});
 const code=url.pathname.split('/')[3];
 const data=code==='5'?[makeRow(0),makeRow(1)]:code?[makeRow(Number(code)-10)]:url.searchParams.get('name')==='nada'?[]:url.searchParams.get('page')==='2'?[makeRow(11),makeRow(12)]:Array.from({length:12},(_,n)=>makeRow(n));
 await route.fulfill({json:{data,page:Number(url.searchParams.get('page')||1),limit:12,returned:data.length}});
});
await page.route('**/api/institutions**',route=>route.fulfill({json:route.request().url().includes('/1101')?institution:{data:[institution],hasMore:false}}));
await page.route('**/api/auth/**',async route=>{
 const data=route.request().postDataJSON();
 await route.fulfill(data.password==='wrongpassword'?{status:401,json:{}}:{json:{token:'test-token-only',tokenType:'Bearer',expiresIn:3600000,userId:42,name:'Persona de prueba',email:'test@example.org',phone:null}});
});
const savedFixture=new Map(); let interestsFixture={areas:[],motivations:[],updatedAt:null};
await page.route('**/api/me/**',async route=>{
 const request=route.request(),url=new URL(request.url()),id=decodeURIComponent(url.pathname.split('/')[4]||'');
 if(url.pathname.endsWith('/preferences')) return route.fulfill({json:{academicLevel:'',modality:'',municipality:'',department:'',mobility:''}});
 if(url.pathname.endsWith('/interests')) {
  if(request.method()==='PUT') interestsFixture={...request.postDataJSON(),updatedAt:new Date().toISOString()};
  return route.fulfill({json:interestsFixture});
 }
 if(request.method()==='GET')return route.fulfill({json:{data:[...savedFixture.values()]}});
 if(request.method()==='DELETE'){savedFixture.delete(id);return route.fulfill({status:204});}
 const item={id,...request.postDataJSON(),savedAt:savedFixture.get(id)?.savedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};savedFixture.set(id,item);return route.fulfill({json:item});
});
try {
 await page.goto(base);
 await page.evaluate(()=>{ localStorage.setItem('eduplan-saved-program-ingenieria-sistemas','true'); localStorage.setItem('eduplan-saved-program-ingenieria-sistemas-aside','true'); });
 await page.reload();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('eduplan-saved-v1-guest')||'[]').length===1);
 await page.goto(`${base}/dashboard`);await page.waitForURL('**/login');
 await page.getByLabel('Correo electrónico').fill('test@example.org');await page.getByLabel('Contraseña',{exact:true}).fill('wrongpassword');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/incorrectos/);
 await page.getByLabel('Contraseña',{exact:true}).fill('Password123!');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:'Hola, Persona de prueba'}).waitFor();assert.equal(await page.locator('.saved-list li').count(),0);
 await page.goto(`${base}/programas`);await page.getByRole('heading',{name:'Programa de prueba 0',exact:true}).waitFor();
 await page.getByRole('button',{name:'Cargar más programas'}).click();await page.getByRole('heading',{name:'Programa de prueba 12',exact:true}).waitFor();assert.equal(await page.locator('.list-item').count(),13);
 await page.locator('.list-item').first().getByRole('button',{name:/^Guardar /}).click();
 for(let n=0;n<3;n++)await page.locator('.list-item').nth(n).getByRole('button',{name:/^Comparar /}).click();assert.equal(await page.locator('.list-item button:disabled').count(),10);
 await page.goto(`${base}/programas/12`);await page.getByRole('heading',{name:'Programa de prueba 2',exact:true}).waitFor();
 await page.goto(`${base}/programas/5`);await page.getByRole('heading',{name:'Selecciona un registro del programa'}).waitFor();assert.equal(await page.locator('.record-option').count(),2);
 await page.goto(`${base}/programas/5?registro=upr9-nkiz%3Arow-0`);await page.getByRole('heading',{name:'Programa de prueba 0',exact:true}).waitFor();assert.equal(await page.locator('.save-button[aria-pressed=true]').count(),1);
 await page.locator('.save-button').first().click();assert.equal(await page.locator('.save-button[aria-pressed=true]').count(),0);
 await page.getByRole('tab',{name:'Descripción',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Plan de estudios',exact:true}).getAttribute('aria-selected'),'true');
 await page.goto(`${base}/programas/5?registro=missing`);await page.getByRole('heading',{name:'Registro no disponible'}).waitFor();
 await page.goto(`${base}/instituciones/1101/programas`);await page.getByRole('heading',{name:'Programa de prueba 0',exact:true}).waitFor();assert(requests.some(url=>url.searchParams.get('institutionCode')==='1101'));
 await page.goto(`${base}/programas?q=error`);await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Reintentar'}).waitFor();
 await page.goto(`${base}/programas?q=nada`);await page.getByRole('heading',{name:'Sin resultados'}).waitFor();
 await page.goto(`${base}/perfil`);await page.getByRole('tab',{name:'Intereses',exact:true}).click();await page.getByRole('button',{name:'Tecnología',exact:true}).click();await page.getByRole('button',{name:'Investigar',exact:true}).click();await page.getByRole('button',{name:'Guardar intereses'}).click();await page.reload();await page.getByText('Intereses: 100%', {exact:true}).waitFor();
 const routes=['/','/programas','/programas/5?registro=upr9-nkiz%3Arow-0','/instituciones','/instituciones/1101','/instituciones/1101/programas','/comparar','/becas','/guias','/dashboard','/perfil','/ruta-inexistente'];
 let checked=0;
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(base+route);await page.locator('main').waitFor();
   if(route.startsWith('/programas') && !route.includes('registro'))await page.getByRole('heading',{name:'Programa de prueba 0',exact:true}).waitFor();
   if(route.includes('registro'))await page.getByRole('heading',{name:'Programa de prueba 0',exact:true}).waitFor();
   if(route.includes('/instituciones/1101/programas'))await page.getByRole('heading',{name:'Programa de prueba 0',exact:true}).waitFor();
   if(route==='/instituciones')await page.getByRole('heading',{name:institution.name}).waitFor();
   const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(sizes.scroll<=sizes.width,`${route} overflows at ${width}: ${sizes.scroll}`);checked++;
   if(['/','/comparar','/perfil','/programas'].includes(route))await page.screenshot({path:`${out}/${route.slice(1)||'landing'}-${width}.png`,fullPage:true});
  }
 }
 await page.goto(`${base}/comparar`);assert.equal(await page.locator('.comparison-selection strong').count(),3);await page.reload();assert.equal(await page.locator('.comparison-selection strong').count(),3);
 await page.getByRole('button',{name:'Salir',exact:true}).click();await page.goto(`${base}/perfil`);await page.waitForURL('**/login');
 for(const width of [1440,1024,768,390]) {
  await page.setViewportSize({width,height:900});
  for(const route of ['/login','/register']) {
   await page.goto(base+route);await page.getByLabel('Correo electrónico').waitFor();
   const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(sizes.scroll<=sizes.width);checked++;
  }
 }
 await page.goto(`${base}/register`);await page.getByLabel('Nombre completo').fill('Persona de prueba');await page.getByLabel('Correo electrónico').fill('test@example.org');await page.getByLabel('Contraseña',{exact:true}).fill('Password123!');await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await page.waitForURL('**/dashboard');
 await page.evaluate(()=>{const data=JSON.parse(sessionStorage.getItem('eduplan-session-v1'));data.expiresAt=Date.now()-1;sessionStorage.setItem('eduplan-session-v1',JSON.stringify(data));});await page.reload();await page.waitForURL('**/login');
 const blocked=await context.newPage();blocked.on('pageerror',error=>errors.push(error.message));
 await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable in test');}}));
 await blocked.goto(`${base}/becas`);await blocked.locator('.save-button').first().click();await blocked.getByText('Los cambios pendientes permanecen durante esta visita.').first().waitFor();await blocked.close();
 assert.deepEqual(errors,[]);console.log(`PASS: ${checked} route/viewport checks; auth, source identity, bookmarks, pagination, tabs, interests and comparison fixtures.`);
} finally { await browser.close(); }
