// Deterministic browser regressions; these fixtures never enter the app catalog.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [], network = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (request.url().includes('/api/')) network.push(request.url()); });
const institutions = [
  { code:'1701', name:'Pontificia Universidad Javeriana', municipality:'Bogotá D.C.', department:'Bogotá D.C.', campus:'Principal', website:'www.javeriana.edu.co' },
  { code:'1702', name:'Pontificia Universidad Javeriana', municipality:'Cali', department:'Valle del Cauca', campus:'Seccional', website:'www.puj.edu.co' },
];
const rows = institutions.map((institution, i) => ({ sourceId:'upr9-nkiz:campus-' + i, code:String(2000 + i), name:'INGENIERIA DE SISTEMAS', nameOrigin:'SNIES_NAME', nameSourceField:'NOMBRE_DEL_PROGRAMA', nameImportedAt:'2026-09-30', rawName:institution.municipality, awardedTitle:'INGENIERO DE SISTEMAS', institutionCode:institution.code, institutionName:institution.name, institutionWebsite:institution.website, institutionMunicipality:institution.municipality, institutionCampus:institution.campus, municipality:institution.municipality, department:institution.department, academicLevel:'Pregrado', educationLevel:'Universitaria', modality:'Presencial', periodCount:'10', periodicity:'Semestral', status:'Activo', knowledgeArea:'Ingeniería de sistemas, telemática y afines' }));
await context.route('**/api/programs**', route => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith('/filters')) return route.fulfill({json:{data:{ academicLevels:['Pregrado'], modalities:['Presencial'], knowledgeAreas:['Ingeniería de sistemas, telemática y afines'], institutions }}});
  const code = url.pathname.split('/')[3];
  const data = code ? rows.filter(row => row.code === code) : url.searchParams.get('institutionCode') ? rows.filter(row => row.institutionCode === url.searchParams.get('institutionCode')) : rows;
  return route.fulfill({json:{data}});
});
await context.route('**/api/institutions**', route => {
  const code = new URL(route.request().url()).pathname.split('/')[3];
  return route.fulfill({json:code ? institutions.find(i => i.code === code) : {data:institutions,hasMore:false}});
});
const saved = { id:'program-upr9-nkiz:campus-0', type:'program', name:'INGENIERIA DE SISTEMAS', href:'/programas/2000?registro=upr9-nkiz%3Acampus-0', savedAt:'2026-09-30T10:00:00Z', snapshot:{nameOrigin:'SNIES_NAME',institution:'Pontificia Universidad Javeriana',city:'Bogotá D.C.',provenance:'real'} };
await context.route('**/api/me/**', route => {
  const url = route.request().url();
  if(url.includes('/matching-preferences'))return route.fulfill({json:{specificNbcs:[],activities:[],contexts:[],excludedNbcs:[],locationImportance:'',modalityImportance:'',duration:'',sector:'',exclusionsReviewed:false}});
  const json = url.includes('/interests') ? {areas:['Tecnología'],motivations:[],updatedAt:null}
    : url.includes('/preferences') ? {academicLevel:'',modality:'',municipality:'',department:'',mobility:''}
    : url.includes('/account') ? {userId:1,name:'Yua',email:'yua@example.test',phone:null}
    : {data:[saved]};
  return route.fulfill({json});
});
await context.addInitScript(() => {
  if (!sessionStorage.getItem('eduplan-session-v1')) sessionStorage.setItem('eduplan-session-v1', JSON.stringify({ token:'fixture-token', user:{id:1,name:'Yua',email:'yua@example.test'}, expiresAt:Date.now()+3600000 }));
});
const out = '.tools/qa/refinements'; await mkdir(out,{recursive:true});
try {
  await page.goto(base + '/programas');
  await page.getByRole('heading',{name:'INGENIERIA DE SISTEMAS',exact:true}).first().waitFor();
  assert.equal(await page.locator('.list-item h3').count(),2);
  assert(!await page.getByRole('heading',{name:'INGENIERO DE SISTEMAS',exact:true}).count());
  assert.match(await page.locator('.list-item').nth(0).innerText(),/Bogotá D.C. · Principal/);
  assert.match(await page.locator('.list-item').nth(1).innerText(),/Cali · Seccional/);
  await page.getByLabel('Universidad o institución').click();
  const first = page.getByRole('option').filter({hasText:'Código 1701'}), second = page.getByRole('option').filter({hasText:'Código 1702'});
  assert.match(await first.innerText(),/Bogotá D.C. · Sede principal/); assert.match(await second.innerText(),/Cali.*Seccional/);
  await second.click(); await page.waitForFunction(()=>document.querySelectorAll('.list-item').length===1);
  assert.match(await page.locator('.list-item').innerText(),/Cali/);
  for (const [i, institution] of institutions.entries()) {
    await page.goto(base + '/programas/' + rows[i].code + '?registro=' + encodeURIComponent(rows[i].sourceId));
    await page.getByRole('heading',{level:1,name:'INGENIERIA DE SISTEMAS'}).waitFor();
    const link = page.locator('.institution-official-actions a').first();
    assert.equal(await link.getAttribute('href'), 'https://' + institution.website + '/');
    assert.equal(await link.getAttribute('target'),'_blank'); assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
    assert.equal(await page.locator('.institution-official-actions').getByRole('link',{name:'Ver institución',exact:true}).getAttribute('href'),'/instituciones/' + institution.code);
    assert.match(await page.locator('.program-hero').innerText(),new RegExp(institution.municipality));
    assert.match(await page.locator('.program-hero').innerText(),/Título otorgado: INGENIERO DE SISTEMAS/);
  }
  assert(network.some(url=>url.includes('/api/program-links/batch?')));
  await page.goto(base + '/dashboard'); await page.getByRole('heading',{name:'Hola, Yua'}).waitFor();
  await page.getByText('17% de perfil básico',{exact:true}).waitFor();
  assert.equal(await page.locator('.user-avatar').innerText(),'Y'); assert.equal(await page.locator('.saved-list > li').count(),1);
  assert.equal(await page.getByRole('link',{name:'Continuar comparación →'}).count(),0);
  await page.goto(base + '/perfil?seccion=cuenta');
  await page.getByLabel('Nombre completo').waitFor();
  const image = await page.evaluate(() => { const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1200;const c=canvas.getContext('2d');c.fillStyle='#102653';c.fillRect(0,0,1600,1200); return canvas.toDataURL('image/png').split(',')[1]; });
  const file = {name:'photo.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')};
  await page.getByLabel('Subir foto de perfil').setInputFiles(file);
  await page.getByRole('img',{name:'Foto de Yua'}).waitFor();
  const photo = await page.evaluate(()=>localStorage.getItem('eduplan-avatar-local-v1-user-1'));
  assert(photo.startsWith('data:image/jpeg;base64,') && photo.length<120000);
  assert.deepEqual(await page.getByRole('img',{name:'Foto de Yua'}).evaluate(img=>[img.naturalWidth,img.naturalHeight]),[256,256]);
  await page.reload(); await page.getByRole('img',{name:'Foto de Yua'}).waitFor();
  await page.getByLabel('Subir foto de perfil').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
  await page.getByText('Selecciona una imagen JPG, PNG o WebP válida.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('img',{name:'Foto de Yua'}).count(),1);
  await page.getByLabel('Subir foto de perfil').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid image')});
  await page.getByText('No pudimos leer esta imagen. Prueba con otra foto.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Eliminar foto'}).click();
  assert.equal(await page.locator('.user-avatar').innerText(),'Y');
  await page.getByLabel('Subir foto de perfil').setInputFiles(file); await page.getByRole('img',{name:'Foto de Yua'}).waitFor();
  await page.evaluate(()=>{const session=JSON.parse(sessionStorage.getItem('eduplan-session-v1'));session.user={id:2,name:'Sebastián',email:'sebastian@example.test'};sessionStorage.setItem('eduplan-session-v1',JSON.stringify(session));});
  await page.reload();await page.getByLabel('Nombre completo').waitFor(); assert.equal(await page.locator('.user-avatar').innerText(),'S');assert.equal(await page.locator('.user-avatar img').count(),0);
  await page.evaluate(()=>{const session=JSON.parse(sessionStorage.getItem('eduplan-session-v1'));session.user={id:1,name:'Yua',email:'yua@example.test'};sessionStorage.setItem('eduplan-session-v1',JSON.stringify(session));});
  await page.reload(); await page.getByRole('img',{name:'Foto de Yua'}).waitFor();
  await page.getByRole('tab',{name:'Resultados',exact:true}).click();await page.getByRole('heading',{name:'Encuentra tu siguiente camino'}).waitFor();
  await page.getByRole('tab',{name:'Cuenta',exact:true}).click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).waitFor();
  await page.getByRole('tab',{name:'Perfil académico',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('[role="tab"][aria-selected="true"]')?.textContent==='Orientación');
  let checks=0;
  for (const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:900});
    for (const route of ['/dashboard','/perfil','/programas','/programas/2000?registro=upr9-nkiz%3Acampus-0']) {
      await page.goto(base+route);await page.locator('main h1').waitFor();
      if(route==='/programas')await page.locator('.list-item').first().waitFor();
      if(route.includes('/2000'))await page.getByRole('heading',{level:1,name:'INGENIERIA DE SISTEMAS'}).waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route + ' at ' + width);
      await page.screenshot({path:out + '/' + route.split('?')[0].replaceAll('/','-') + '-' + width + '.png',fullPage:true});checks++;
      await page.locator('footer').scrollIntoViewIfNeeded();
      const launcher = page.getByRole('button',{name:'Abrir asistente EduPlan',exact:true});
      const count = network.length, scroll = await page.evaluate(()=>scrollY);
      await launcher.focus();await page.keyboard.press('Enter');
      await page.getByRole('dialog',{name:'Asistente EduPlan',exact:true}).waitFor();
      assert(await page.getByLabel('Escribe tu pregunta',{exact:true}).isDisabled());assert(await page.getByRole('button',{name:'Enviar',exact:true}).isDisabled());
      const bounds = await page.locator('dialog').boundingBox();assert(bounds.x>=0 && bounds.x+bounds.width<=width && bounds.y>=0);
      assert.equal(network.length,count); await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(),0);assert(await launcher.evaluate(el=>el===document.activeElement));assert.equal(await page.evaluate(()=>scrollY),scroll);
    }
    await page.getByRole('button',{name:'Asistente EduPlan',exact:true}).click();await page.getByRole('dialog').waitFor();
    await page.screenshot({path:out+'/assistant-footer-'+width+'.png',fullPage:true});
    await page.getByRole('button',{name:'Cerrar asistente EduPlan'}).click();assert(await page.getByRole('button',{name:'Asistente EduPlan',exact:true}).evaluate(el=>el===document.activeElement));
  }
  const links = await page.locator('footer a[href^="/"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  assert.deepEqual(links,['/','/instituciones','/programas','/becas','/guias','/dashboard','/perfil']);
  const official=JSON.parse(await readFile(new URL('../../data-integration/data/snies-program-names.json',import.meta.url),'utf8'));
  const longest=official.records.filter(row=>row[1]==='1701').sort((a,b)=>b[2].length-a[2].length)[0];
  const longRow={...rows[0],sourceId:'upr9-nkiz:long-name-fixture',code:'long',name:longest[2],awardedTitle:longest[3],academicLevel:longest[4]};
  await context.route('**/api/programs/long',route=>route.fulfill({json:{data:[longRow]}}));
  await context.route('**/api/programs?**',route=>route.fulfill({json:{data:[longRow]}}));
  for (const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:900});
    for (const route of ['/programas?q=long','/programas/long']) {
      await page.goto(base+route);await page.getByRole('heading',{name:longRow.name,exact:true}).waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:out+'/long-'+(route.includes('/long')?'detail':'card')+'-'+width+'.png',fullPage:true});checks++;
    }
  }
  await page.evaluate(row=>localStorage.setItem('eduplan-compare-v1-user-1',JSON.stringify([{...row,id:row.sourceId,provenance:'real',institution:row.institutionName,city:row.municipality}])),rows[0]);
  await page.goto(base+'/dashboard');await page.getByRole('link',{name:'Continuar comparación →',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: academic headings, 1701/1702 websites/campuses, upload/compression/removal/account isolation, profile tabs, real dashboard, footer routes, disabled assistant, Escape/focus/scroll; ' + checks + ' route/viewport cases.');
} finally { await browser.close(); }
