// Real Spring/PostgreSQL writes, using only a disposable local QA account.
import {createRequire} from 'node:module';
import {randomBytes,randomInt} from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH||'playwright');
const base=process.env.EDUPLAN_TEST_URL||'http://localhost:3005';
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext(),page=await context.newPage();
page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const email=`profile-${randomBytes(5).toString('hex')}@example.test`,password=randomBytes(16).toString('base64url'),phone='3'+String(randomInt(100000000,999999999));
async function academic(p){await p.goto(base+'/perfil');await p.getByLabel('Nivel académico').waitFor();await p.waitForFunction(()=>!document.querySelector('.academic-steps')?.disabled);}
async function save(){await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();await page.getByText('Tu perfil académico está guardado. Ya puedes explorar tus recomendaciones.',{exact:true}).waitFor();}
try{
  await page.goto(base+'/register');await page.getByLabel('Nombre completo').fill('Prueba perfil');await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await page.waitForURL('**/dashboard');
  await academic(page);await page.getByLabel('Nivel académico').selectOption('Pregrado');await page.getByLabel('Cobertura geográfica').selectOption('CITY');await page.getByLabel('Departamento',{exact:true}).selectOption('Antioquia');await page.getByLabel('Ciudad o municipio').selectOption('Medellín');
  await page.getByLabel('Departamento',{exact:true}).selectOption('Cundinamarca');assert.equal(await page.getByLabel('Ciudad o municipio').inputValue(),'');await page.getByLabel('Ciudad o municipio').selectOption('Chía');await page.getByLabel('Modalidad de estudio').selectOption('Presencial');await page.getByRole('button',{name:'Tecnología',exact:true}).click();await page.getByRole('button',{name:'Investigar',exact:true}).click();await save();
  await page.reload();await page.getByLabel('Ciudad o municipio').waitFor();assert.equal(await page.getByLabel('Ciudad o municipio').inputValue(),'Chía');assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'100');
  await page.getByLabel('Cobertura geográfica').selectOption('DEPARTMENT');await save();assert.equal(await page.getByLabel('Ciudad o municipio').count(),0);
  await page.getByLabel('Cobertura geográfica').selectOption('ANY');await save();assert.equal(await page.getByLabel('Departamento',{exact:true}).count(),0);
  await page.getByRole('tab',{name:'Orientación',exact:true}).click();await page.getByRole('link',{name:'Afinar mis recomendaciones',exact:true}).waitFor();
  await page.getByRole('tab',{name:'Resultados',exact:true}).click();assert.equal(await page.getByRole('link',{name:'Ver mis recomendaciones'}).getAttribute('href'),'/recomendaciones');
  await page.getByRole('tab',{name:'Cuenta',exact:true}).click();await page.getByLabel('Nombre completo').fill('Perfil guardado');await page.getByLabel('Teléfono').fill(phone);await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Tus datos están guardados.',{exact:true}).waitFor();
  const device=await browser.newContext(),other=await device.newPage();other.setDefaultTimeout(45000);await other.goto(base+'/login');await other.getByLabel('Correo electrónico').fill(email);await other.getByLabel('Contraseña',{exact:true}).fill(password);await other.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await other.waitForURL('**/dashboard');await other.getByRole('heading',{name:'Hola, Perfil guardado'}).waitFor();
  await academic(other);assert.equal(await other.getByLabel('Cobertura geográfica').inputValue(),'ANY');assert.equal(await other.getByLabel('Nivel académico').inputValue(),'Pregrado');assert.equal(await other.getByLabel('Modalidad de estudio').inputValue(),'Presencial');assert.equal(await other.getByRole('button',{name:'Tecnología',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await other.getByRole('button',{name:'Investigar',exact:true}).getAttribute('aria-pressed'),'true');
  await other.getByRole('tab',{name:'Cuenta',exact:true}).click();await other.getByLabel('Nombre completo').waitFor();assert.equal(await other.getByLabel('Nombre completo').inputValue(),'Perfil guardado');assert.equal(await other.getByLabel('Teléfono').inputValue(),phone);assert.equal(await other.getByLabel('Correo de acceso').inputValue(),email);assert(await other.getByLabel('Correo de acceso').evaluate(el=>el.readOnly));
  await other.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await other.waitForURL('**/login');assert.deepEqual(errors,[]);
  console.log('PASS: real registration, coherent location, three coverage modes, unified profile save/reload, upcoming CTA, results link, account save, second-device persistence and logout.');
}finally{await browser.close();}
