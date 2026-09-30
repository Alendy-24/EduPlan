// Real MEN/SNIES + Spring preferences. Creates only disposable local QA accounts; no production writes.
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base=process.env.EDUPLAN_TEST_URL||'http://127.0.0.1:5173';
const out=fileURLToPath(new URL('../../.tools/qa/recommendations/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.EDUPLAN_BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(70000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const email=`recommendations-${randomBytes(5).toString('hex')}@example.test`,password=randomBytes(16).toString('base64url');
async function login(p){await p.goto(base+'/login');await p.getByLabel('Correo electrónico').fill(email);await p.getByLabel('Contraseña',{exact:true}).fill(password);await p.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await p.waitForFunction(()=>Boolean(JSON.parse(sessionStorage.getItem('eduplan-session-v1')||'null')?.token));await p.getByRole('button',{name:'Salir',exact:true}).waitFor();}
async function preferencesTab(p){await p.goto(base+'/perfil');await p.getByRole('tab',{name:'Preferencias académicas'}).click();await p.getByLabel('Nivel buscado').waitFor();}
try {
 await page.goto(base+'/register');await page.getByLabel('Nombre completo').fill('Prueba recomendaciones');await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await page.waitForURL('**/dashboard');
 await page.goto(base+'/recomendaciones');await page.getByRole('link',{name:'Completar mi perfil'}).waitFor();assert.equal(await page.locator('.compatibility').count(),0);
 await page.goto(base+'/perfil');await page.getByRole('tab',{name:'Intereses',exact:true}).click();await page.getByRole('button',{name:'Tecnología',exact:true}).click();await page.getByRole('button',{name:'Investigar',exact:true}).click();await page.getByRole('button',{name:'Guardar intereses'}).click();await page.getByText('Intereses guardados en tu cuenta.',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Preferencias académicas'}).click();await page.getByLabel('Nivel buscado').selectOption('Pregrado');await page.getByLabel('Modalidad preferida').selectOption('Presencial');await page.getByLabel('Disposición geográfica').selectOption('CITY');await page.getByLabel('Municipio / ciudad').fill('Bogotá');await page.getByLabel('Departamento',{exact:true}).fill('Bogotá D.C.');
 const stored=page.waitForResponse(r=>r.url().endsWith('/api/me/preferences')&&r.request().method()==='PUT');await page.getByRole('button',{name:'Guardar preferencias',exact:true}).click();assert.equal((await stored).status(),200);await page.getByText('Preferencias guardadas en tu cuenta.',{exact:true}).waitFor();await page.getByText('Perfil académico: 100 % completado. El presupuesto no se usa para calcular compatibilidad.',{exact:true}).waitFor();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/recommendations')&&r.status()===200);await page.goto(base+'/recomendaciones');const payload=await(await response).json();assert.equal(payload.status,'OK');assert.equal(payload.data.length,20);
 assert(payload.data.every(row=>row.program.status==='Activo'&&row.program.nameOrigin==='SNIES_NAME'&&!row.program.reviewRequired&&row.program.academicLevel==='Pregrado'&&row.score>=0&&row.score<=100));
 await page.locator('.recommendation-result').first().waitFor();await page.locator('.recommendation-result').first().getByText('¿Por qué me lo recomiendan?',{exact:true}).click();assert.match(await page.locator('.recommendation-result').first().innerText(),/no predice admisión/);
 let put=page.waitForResponse(r=>r.url().includes('/api/me/saved/')&&r.request().method()==='PUT');await page.locator('.recommendation-result').first().getByRole('button',{name:/^Guardar /}).click();assert.equal((await put).status(),200);
 for(let n=0;n<3;n++) await page.locator('.recommendation-result').nth(n).getByRole('button',{name:/^Comparar /}).click();
 const detail=await page.locator('.recommendation-result').first().getByRole('link',{name:'Ver programa',exact:true}).getAttribute('href');await page.goto(base+detail);await page.getByRole('heading',{name:'Por qué puede interesarte',exact:true}).waitFor();await page.locator('.personal-match .compatibility').waitFor();await page.getByText('Núcleo básico de conocimiento (NBC)',{exact:true}).waitFor();
 console.log('PASS: profile persisted, real top20 offers, explanation, saving and exact detail');
 await page.goto(base+'/comparar');await page.locator('.comparison-personal .compatibility').first().waitFor();assert.equal(await page.locator('.personal-match .compatibility').count(),3);
 await page.goto(base+'/dashboard');await page.locator('.recommendation-result').first().waitFor();assert.equal(await page.locator('.recommendation-result').count(),3);assert.equal(await page.locator('.saved-list li').count(),1);
 let checked=0;
 for(const width of [375,390,430,768,1366]) {
  await page.setViewportSize({width,height:900});
  for(const path of ['/recomendaciones','/dashboard','/comparar',detail,'/perfil']) {
   await page.goto(base+path);
   if(path==='/perfil') {await page.getByRole('tab',{name:'Preferencias académicas'}).click();await page.getByLabel('Nivel buscado').waitFor();}
   else if(['/recomendaciones','/dashboard'].includes(path)) await page.locator('.recommendation-result').first().waitFor();
   else await page.locator('.personal-match .compatibility').first().waitFor();
   const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(size.scroll<=size.width,`${path} overflow ${width}: ${size.scroll}`);checked++;
   if(path==='/recomendaciones'||path==='/perfil') { await page.screenshot({path:`${out}/${path.slice(1)}-${width}.png`,fullPage:true});await page.screenshot({path:`${out}/${path.slice(1)}-viewport-${width}.png`,fullPage:false}); }
  }
 }
 console.log(`PASS: ${checked} responsive checks at five widths`);
 await page.goto(base+'/recomendaciones');await page.locator('.recommendation-result').first().waitFor();
 let ranked=page.waitForResponse(r=>r.url().endsWith('/api/recommendations')&&r.status()===200);
 await page.locator('.recommendation-result').first().getByRole('button',{name:/^No me interesa /}).click();
 const excluded=await(await ranked).json();assert(!excluded.data.some(row=>row.program.sourceId===payload.data[0].program.sourceId));
 await page.reload();await page.getByRole('button',{name:'Restaurar recomendaciones ocultas'}).waitFor();await page.getByRole('button',{name:'Restaurar recomendaciones ocultas'}).click();await page.locator('.recommendation-result').first().waitFor();
 // Independent context has no shared localStorage/sessionStorage: persistence must come from Spring.
 const other=await browser.newContext(),device=await other.newPage();device.setDefaultTimeout(70000);await login(device);await preferencesTab(device);assert.equal(await device.getByLabel('Municipio / ciudad').inputValue(),'Bogotá');assert.equal(await device.getByLabel('Nivel buscado').inputValue(),'Pregrado');
 await page.getByRole('button',{name:'Salir',exact:true}).click();await login(page);await preferencesTab(page);assert.equal(await page.getByLabel('Modalidad preferida').inputValue(),'Presencial');
 await page.getByRole('button',{name:'Salir',exact:true}).click();await page.goto(base+'/register');await page.getByLabel('Nombre completo').fill('Otra cuenta recomendaciones');await page.getByLabel('Correo electrónico').fill(`other-${randomBytes(5).toString('hex')}@example.test`);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await page.waitForURL('**/dashboard');await preferencesTab(page);assert.equal(await page.getByLabel('Municipio / ciudad').inputValue(),'');assert.equal(await page.getByLabel('Nivel buscado').inputValue(),'');
 assert.deepEqual(errors,[]);console.log(`PASS: real recommendations top20/dashboard3, profile persistence/relogin/second device/account isolation, explanations, save/compare/detail, ${checked} responsive checks. First: ${payload.data[0].program.name}; ${payload.data[0].score}%`);
} finally { await browser.close(); }
