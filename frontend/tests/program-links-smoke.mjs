import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ channel:'msedge',headless:true });
const page = await browser.newPage(); page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const base=process.env.EDUPLAN_TEST_URL || 'http://127.0.0.1:5173';
const source='upr9-nkiz:row-links-test';
const program={sourceId:source,code:'11',institutionCode:'1813',institutionName:'Universidad de los Andes',name:'ARQUITECTO',rawName:'Bogotá D.C.',awardedTitle:'ARQUITECTO',academicLevel:'Pregrado',educationLevel:'Universitaria',municipality:'Bogotá D.C.',department:'Bogotá D.C.',modality:'Presencial',periodCount:'8',periodicity:'Semestral',status:'Activo',knowledgeArea:'Arquitectura',nameOrigin:'AWARDED_TITLE',reviewRequired:true};
let state='VERIFIED',unavailable=false;
const official='https://www.uniandes.edu.co/es/programas/arquitectura';
await page.route('**/api/programs/11',route=>route.fulfill({json:{data:[program,{...program,sourceId:source+'-other'}]}}));
await page.route('**/api/institutions/1813*',route=>route.fulfill({json:{code:'1813',name:'Universidad de los Andes',website:'https://www.uniandes.edu.co'}}));
await page.route('**/api/program-links?*',route=>unavailable?route.fulfill({status:503,json:{message:'No disponible'}}):route.fulfill({json:{sourceId:new URL(route.request().url()).searchParams.get('sourceId'),status:state,...(state==='VERIFIED'?{url:official,officialName:'Arquitectura',checkedAt:'2026-09-30T00:00:00Z'}:{})}}));
try {
  await page.goto(`${base}/programas/11?registro=${source}`);
  const link=page.getByRole('link',{name:'Sitio oficial del programa ↗',exact:true});await link.waitFor();assert.equal(await link.getAttribute('href'),official);
  await page.getByRole('heading',{name:'Arquitectura',exact:true,level:1}).waitFor();
  assert.equal(await page.locator('.fact-row').filter({has:page.locator('dt',{hasText:'Título otorgado'})}).locator('dd').innerText(),'ARQUITECTO');
  await page.getByRole('link',{name:'Sitio oficial de la institución ↗',exact:true}).waitFor();
  for(const tab of ['Plan de estudios','Admisión','Costos']) { await page.getByRole('tab',{name:tab,exact:true}).click();assert.equal(await page.getByRole('link',{name:'Consultar la página oficial del programa ↗',exact:true}).getAttribute('href'),official); }
  for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); }
  for(const status of ['PENDING','NOT_FOUND','UNAVAILABLE']) {
    state=status;await page.reload();
    const message=status==='PENDING'?'El enlace de este programa está pendiente de verificación.':status==='NOT_FOUND'?'Todavía no tenemos un enlace verificado de este programa.':'El enlace del programa ya no está disponible. Puedes consultar la institución.';
    await page.getByText(message,{exact:true}).waitFor();assert.equal(await link.count(),0);
  }
  unavailable=true;await page.reload();await page.getByRole('button',{name:'Reintentar enlace del programa',exact:true}).waitFor();
  unavailable=false;state='VERIFIED';await page.getByRole('button',{name:'Reintentar enlace del programa',exact:true}).click();await link.waitFor();
  await page.goto(`${base}/programas/11`);await page.getByRole('heading',{name:'Selecciona un registro del programa'}).waitFor();assert.equal(await link.count(),0);
  await page.unroute('**/api/program-links?*');
  await page.route('**/api/program-links?*',async route=>{
    const id=new URL(route.request().url()).searchParams.get('sourceId');
    if(id===source)await new Promise(resolve=>setTimeout(resolve,700));
    await route.fulfill({json:{sourceId:id,status:id===source?'VERIFIED':'PENDING',...(id===source?{url:official,checkedAt:'2026-09-30T00:00:00Z'}:{})}}).catch(()=>{});
  });
  await page.goto(`${base}/programas/11?registro=${source}`);await page.getByRole('heading',{name:program.name,exact:true}).waitFor();
  await page.evaluate(id=>{history.pushState({},'',`/programas/11?registro=${id}`);dispatchEvent(new PopStateEvent('popstate'));},source+'-other');
  await page.getByText('El enlace de este programa está pendiente de verificación.',{exact:true}).waitFor();
  await page.waitForTimeout(900);assert.equal(await link.count(),0);
  assert.equal(await page.getByRole('heading',{name:'Arquitectura',exact:true,level:1}).count(),0);
  await page.route('**/api/programs?*',route=>route.fulfill({json:{data:[program]}}));
  await page.route('**/api/programs/filters',route=>route.fulfill({json:{data:{academicLevels:['Pregrado'],knowledgeAreas:['Arquitectura'],modalities:['Presencial'],institutions:[{code:'1813',name:'Universidad de los Andes'}]}}}));
  await page.route('**/api/program-links/batch?*',route=>route.fulfill({json:{data:new URL(route.request().url()).searchParams.getAll('sourceId').map(id=>({sourceId:id,status:'VERIFIED',url:official,officialName:'Arquitectura',checkedAt:'2026-09-30T00:00:00Z'}))}}));
  await page.goto(`${base}/programas`);await page.getByRole('heading',{name:'Arquitectura',exact:true,level:3}).waitFor();
  await page.getByRole('button',{name:'Comparar Arquitectura',exact:true}).click();await page.getByRole('link',{name:'Abrir comparador →',exact:true}).click();
  await page.getByRole('link',{name:'Ver Arquitectura',exact:true}).waitFor();assert(await page.getByText('Título otorgado',{exact:true}).count()>0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',checked:['exact source identity','official program name and awarded title','list and comparison','program URL','institution fallback','tabs','retry','multiple rows','four widths','late response cancellation']}));
} finally { await browser.close(); }
