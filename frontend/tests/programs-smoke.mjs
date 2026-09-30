import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {normalizeProgramPage,programSearchMatches} from '../src/utils/programs.js';
const {chromium}=createRequire(import.meta.url)(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base=process.env.EDUPLAN_TEST_URL || 'http://127.0.0.1:5173';
const directBase=process.env.EDUPLAN_INTEGRATION_TEST_URL || 'http://127.0.0.1:3001';
const out=fileURLToPath(new URL('../../.tools/qa/programs-fix/',import.meta.url));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();page.setDefaultTimeout(45000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report=[];const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('es');
async function loaded() { await page.waitForFunction(()=>![...document.querySelectorAll('[role=status]')].some(el=>el.textContent.includes('Cargando'))); }
try {
 await page.goto(`${base}/programas`);
 for(const query of ['ingeniero','sistemas','inge','civil','medicina','derecho']) {
  const pending=page.waitForResponse(r=>r.url().includes('/api/programs?')&&new URL(r.url()).searchParams.get('name')===query);
  await page.getByLabel('Buscar programas',{exact:true}).fill(query);
  const response=await pending, payload=await response.json(), url=new URL(response.url());
  assert.equal(response.status(),200);
  const direct=await page.request.get(directBase+url.pathname+url.search);
  assert.equal(direct.status(),200);assert.deepEqual(await direct.json(),payload);
  const result=normalizeProgramPage(payload);await loaded();
  await page.waitForFunction(count=>document.querySelectorAll('.list-item').length===count,result.programs.length);
  const visible=await page.locator('.list-item h3').allTextContents();
  assert.equal(await page.getByRole('alert').count(),0);
  assert(result.programs.every(p=>programSearchMatches(p,query).length>0));
  const text=await page.locator('.list-item').allTextContents();assert(text.every(t=>fold(t).includes(fold(query))));
  report.push({query,http:response.status(),url:url.href,params:Object.fromEntries(url.searchParams),api:payload.data.length,usable:result.programs.length,unusable:result.unusableCount,visible,rows:payload.data});
  console.log(JSON.stringify({query,http:response.status(),api:payload.data.length,usable:result.programs.length,first:visible.slice(0,3)}));
  await page.screenshot({path:`${out}/${query}-1440.png`,fullPage:true});
 }
 const unspecified=report.flatMap(r=>r.rows).find(p=>p.code==='No especifica');assert(unspecified);
 const detail=`/programas/${encodeURIComponent(unspecified.code)}?registro=${encodeURIComponent(unspecified.sourceId)}`;
 const response=await page.request.get(`${base}/api/programs/${encodeURIComponent(unspecified.code)}`);
 assert.equal(response.status(),200);const rows=(await response.json()).data;assert(rows.some(p=>p.sourceId===unspecified.sourceId));
 await page.goto(base+detail);await page.getByRole('heading',{name:unspecified.name,exact:true}).waitFor();
 await page.locator('.save-button').first().click();assert.equal(await page.locator('.save-button[aria-pressed=true]').count(),2);
 await page.getByRole('button',{name:/^Comparar /}).click();await page.goto(`${base}/comparar`);await page.reload();
 await page.getByRole('link',{name:`Ver ${unspecified.name}`,exact:true}).waitFor();
 console.log(`PASS: detalle opaco real HTTP 200, ${rows.length} filas, sourceId exacto, guardados y comparación recargada`);
 const filters=[{q:'sistemas',city:'Bogotá D.C.'},{q:'sistemas',modality:'Presencial'},{city:'Bogotá D.C.',modality:'Presencial'},{q:'sistemas',city:'Bogotá D.C.',modality:'Presencial'}];
 for(const filter of filters) {
  const pending=page.waitForResponse(r=>r.url().includes('/api/programs?'));
  await page.goto(`${base}/programas?${new URLSearchParams(filter)}`);
  const response=await pending;assert.equal(response.status(),200);const body=await response.json();await loaded();
  assert(body.data.length>0);await page.locator('.list-item').first().waitFor();
  console.log(`PASS: filtros reales ${JSON.stringify(filter)} -> ${body.data.length} filas`);
 }
 for (const [label,value,key] of [['Área de conocimiento','Ingeniería de sistemas telemática y afines','knowledgeArea'],['Nivel académico','Pregrado','academicLevel'],['Ordenar por','asc','order']]) {
  const pending=page.waitForResponse(r=>r.url().includes('/api/programs?')&&new URL(r.url()).searchParams.get(key)===value);
  await page.getByLabel(label,{exact:true}).selectOption(value);const response=await pending;assert.equal(response.status(),200);
 }
 await loaded();await page.waitForFunction(()=>document.querySelectorAll('.list-item').length>0);
 const names=await page.locator('.list-item h3').allTextContents();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'es')));
 await page.getByText('Los filtros y el orden se aplican a todo el catálogo. El conteo corresponde a los registros cargados.').waitFor();
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:900});await page.goto(`${base}/programas?q=civil`);await page.locator('.list-item').first().waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}/civil-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/real-results.json`,JSON.stringify(report,null,2));
 // Explicit fixtures below exercise unavailable and out-of-order data, never application fallback.
 const fixture=await browser.newPage();fixture.setDefaultTimeout(15000);
 await fixture.addInitScript(()=>{
  const fetchOriginal=window.fetch;
  window.fetch=(url,options)=>fetchOriginal(url,typeof url==='string'&&url.startsWith('/api/programs?')?{...options,signal:undefined}:options);
 });
 const makeRow=n=>({sourceId:`upr9-nkiz:fixture-${n}`,code:'No especifica',name:`Programa ${n}`,institutionName:'Institución de prueba',municipality:'Bogotá',academicLevel:'Pregrado',modality:'Presencial'});
 const civil={...makeRow(30),name:'Doctor en Ingeniería',rawName:'Doctorado en Ingeniería Civil',awardedTitle:'Doctor en Ingeniería',nameOrigin:'AWARDED_TITLE',reviewRequired:true,knowledgeArea:'Ingeniería civil y afines'};
 let release,started;const gate=new Promise(resolve=>release=resolve), oldStarted=new Promise(resolve=>started=resolve);
 await fixture.route('**/api/programs?**',async route=>{
  const url=new URL(route.request().url()), query=url.searchParams.get('name');
  if(query==='inge') {started();await gate;return route.fulfill({json:{data:[{...makeRow(20),name:'Respuesta vieja de inge'}]}});}
  const data=query==='civil'?[civil]:query==='corrupto'?[null]:url.searchParams.get('page')==='2'?[makeRow(12)]:[...Array.from({length:10},(_,n)=>makeRow(n)),{...makeRow(10),code:''},null];
  return route.fulfill({json:{data}});
 });
 await fixture.goto(`${base}/programas`);await fixture.locator('.list-item').first().waitFor();
 assert.equal(await fixture.locator('.list-item').count(),11);
  await fixture.getByText('1 registro recibido no puede mostrarse',{exact:false}).waitFor();
 await fixture.getByText('Detalle no disponible: falta el código publicado.',{exact:true}).waitFor();
 await fixture.getByRole('button',{name:'Cargar más programas'}).click();await fixture.getByRole('heading',{name:'Programa 12',exact:true}).waitFor();
 assert.equal(await fixture.locator('.list-item').count(),12);
 await fixture.getByLabel('Buscar programas',{exact:true}).fill('inge');await oldStarted;
 const next=fixture.waitForResponse(r=>r.url().includes('/api/programs?')&&new URL(r.url()).searchParams.get('name')==='civil');
 await fixture.getByLabel('Buscar programas',{exact:true}).fill('civil');await next;
 await fixture.getByRole('heading',{name:'Doctor en Ingeniería',exact:true}).waitFor();
 await fixture.getByText('Nombre publicado (sin verificar): Doctorado en Ingeniería Civil',{exact:true}).waitFor();
 const old=fixture.waitForResponse(r=>r.url().includes('/api/programs?')&&new URL(r.url()).searchParams.get('name')==='inge');release();await old;
 await fixture.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await fixture.getByRole('heading',{name:'Respuesta vieja de inge'}).count(),0);
 assert.equal(await fixture.getByLabel('Buscar programas',{exact:true}).inputValue(),'civil');
 await fixture.getByRole('heading',{name:'Doctor en Ingeniería',exact:true}).waitFor();
 await fixture.getByLabel('Buscar programas',{exact:true}).fill('corrupto');await fixture.getByRole('alert').waitFor();
 assert.equal(await fixture.getByText('0 coincidencias en 0 registros cargados',{exact:true}).count(),0);
 await fixture.close();
 console.log('PASS: registros incompletos/corruptos, paginación con tamaño original, match civil y respuesta vieja ignorada incluso sin cancelación de transporte');
} finally {await browser.close();}
