// Real authenticated services and fresh browser contexts simulate two devices.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH||'playwright');
const base=process.env.EDUPLAN_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'msedge',headless:true});
const first=await browser.newContext(),second=await browser.newContext();
const page=await first.newPage(),other=await second.newPage();
page.setDefaultTimeout(45000);other.setDefaultTimeout(45000);
const errors=[];[page,other].forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
const suffix=randomBytes(5).toString('hex'),email=`sync-${suffix}@example.test`,password=randomBytes(16).toString('base64url');
async function login(p){await p.goto(base+'/login');await p.getByLabel('Correo electrónico').fill(email);await p.getByLabel('Contraseña',{exact:true}).fill(password);await p.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await p.waitForURL('**/dashboard');await p.getByText('Guardados sincronizados con tu cuenta.',{exact:true}).waitFor();}
try{
 await page.goto(base+'/register');await page.getByLabel('Nombre completo').fill('Prueba sincronización');await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByText('Guardados sincronizados con tu cuenta.',{exact:true}).waitFor();
 const pending=page.waitForResponse(r=>r.url().includes('/api/programs?')&&r.status()===200);
 await page.goto(base+'/programas?q=sistemas&level=Pregrado&institution=1101');const rows=(await (await pending).json()).data;
 await page.locator('.list-item').first().waitFor();
 let put=page.waitForResponse(r=>r.url().includes('/api/me/saved/')&&r.request().method()==='PUT');await page.locator('.list-item').first().getByRole('button',{name:/^Guardar /}).click();assert.equal((await put).status(),200);
 await page.goto(base+'/becas');put=page.waitForResponse(r=>r.url().includes('/api/me/saved/')&&r.request().method()==='PUT');await page.locator('.save-button').first().click();assert.equal((await put).status(),200);
 await page.goto(base+'/perfil');await page.getByRole('tab',{name:'Intereses',exact:true}).click();await page.getByRole('button',{name:'Tecnología',exact:true}).click();await page.getByRole('button',{name:'Investigar',exact:true}).click();await page.getByRole('button',{name:'Guardar intereses'}).click();await page.getByText('Intereses guardados en tu cuenta.',{exact:true}).waitFor();
 await login(other);assert.equal(await other.locator('.saved-list li').count(),2);await other.goto(base+'/perfil?seccion=intereses');await other.getByText('Intereses: 100%',{exact:true}).waitFor();
 console.log('PASS: programa, beca e intereses recuperados en otro contexto sin localStorage compartido');
 // Persist an old status in this disposable QA account, then compare against the real source.
 const token=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('eduplan-session-v1')).token);
 const auth={Authorization:`Bearer ${token}`};
 const saved=(await(await page.request.get(base+'/api/me/saved',{headers:auth})).json()).data;
 const program=saved.find(item=>item.type==='program');
 const changed=await page.request.put(base+'/api/me/saved/'+encodeURIComponent(program.id),{headers:auth,data:{type:program.type,name:program.name,href:program.href,snapshot:{...program.snapshot,status:'Estado anterior de prueba'}}});assert.equal(changed.status(),200);
 await page.goto(base+'/dashboard');await page.getByText('Guardados sincronizados con tu cuenta.',{exact:true}).waitFor();await page.getByRole('button',{name:'Comprobar cambios en las fuentes'}).click();await page.getByText('La información publicada cambió.',{exact:true}).waitFor();
 put=page.waitForResponse(r=>r.url().includes('/api/me/saved/')&&r.request().method()==='PUT');await page.getByRole('button',{name:'Actualizar resumen guardado'}).click();assert.equal((await put).status(),200);
 console.log('PASS: cambio de estado detectado con consulta real y resumen actualizado en backend');
 // A failed write survives reload and is retried, rather than falsely claiming synchronization.
 await page.goto(base+'/programas?q=sistemas&level=Pregrado&institution=1101');await page.locator('.list-item').nth(1).waitFor();
 await page.route('**/api/me/saved/**',route=>route.abort());await page.locator('.list-item').nth(1).getByRole('button',{name:/^Guardar /}).click();await page.getByText('Pendiente de sincronizar.',{exact:false}).first().waitFor();
 assert(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('eduplan-saved-pending-v1-user-')).some(k=>JSON.parse(localStorage.getItem(k)).length>0)));
 await page.unroute('**/api/me/saved/**');await page.goto(base+'/dashboard');await page.reload();await page.getByText('Guardados sincronizados con tu cuenta.',{exact:true}).waitFor();assert.equal(await page.locator('.saved-list li').count(),3);
 await other.goto(base+'/dashboard');await other.reload();await other.getByText('Guardados sincronizados con tu cuenta.',{exact:true}).waitFor();assert.equal(await other.locator('.saved-list li').count(),3);
 const removal=other.waitForResponse(r=>r.request().method()==='DELETE');await other.getByRole('button',{name:/^Quitar .* de guardados$/}).first().click();assert.equal((await removal).status(),204);
 await page.reload();await page.getByText('Guardados sincronizados con tu cuenta.',{exact:true}).waitFor();assert.equal(await page.locator('.saved-list li').count(),2);
 console.log('PASS: error/reintento, cola persistida, eliminación en otro dispositivo sin resurrección');
 await other.getByRole('button',{name:'Salir',exact:true}).click();await other.goto(base+'/becas');assert.equal(await other.locator('.save-button[aria-pressed=true]').count(),0);
 assert.equal(await other.evaluate(()=>JSON.parse(localStorage.getItem('eduplan-saved-v1-guest')||'[]').length),0);
 const guestRow=rows[2];const detail=`/programas/${encodeURIComponent(guestRow.code)}?registro=${encodeURIComponent(guestRow.sourceId)}`;
 await other.goto(base+detail);await other.locator('.save-button').first().click();await login(other);assert.equal(await other.locator('.saved-list li').count(),2);
 console.log('PASS: datos de invitado separados y sin falsas opciones por claves de migración');
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable in test');}}));
 const memory=await blocked.newPage();memory.on('pageerror',error=>errors.push(error.message));memory.setDefaultTimeout(45000);
 await login(memory);await memory.goto(base+'/perfil?seccion=intereses');await memory.getByRole('button',{name:'Salud',exact:true}).click();
 await memory.route('**/api/me/interests',route=>route.request().method()==='PUT'?route.abort():route.continue());
 await memory.getByRole('button',{name:'Guardar intereses'}).click();await memory.getByText('No pudimos guardar en tu cuenta ni en este dispositivo.',{exact:false}).waitFor();
 assert.equal(await memory.getByRole('button',{name:'Salud',exact:true}).getAttribute('aria-pressed'),'true');
 await memory.unroute('**/api/me/interests');await memory.getByRole('button',{name:'Reintentar sincronización'}).click();
 await memory.waitForFunction(()=>!document.body.textContent.includes('Cargando intereses de tu cuenta')&&!document.body.textContent.includes('Reintentar sincronización'));
 assert.equal(await memory.getByRole('button',{name:'Salud',exact:true}).getAttribute('aria-pressed'),'true');
 const interests=(await(await memory.request.get(base+'/api/me/interests',{headers:auth})).json()).areas;assert(interests.includes('Salud'));
 console.log('PASS: intereses conservados en memoria y reintentados con red y almacenamiento bloqueados');
 await blocked.close();assert.deepEqual(errors,[]);
}finally{await browser.close();}
