import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPage, sitemapLinks, matchPage } from '../tools/program-links/extract.mjs';
import { approvedUrl, publicAddress, robotsPolicy, fetchSafe } from '../tools/program-links/network.mjs';
import { collectInstitution, checkCandidate, summarize } from '../tools/program-links/collect.mjs';
import { collect, saveJson, readJson } from '../tools/program-links/collect.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const program = { sourceId:'upr9-nkiz:row-test', institutionCode:'1813', code:'11', name:'Administración de Empresas', awardedTitle:'Administrador(a) de Empresas', academicLevel:'Pregrado', municipality:'Bogotá D.C.', modality:'Presencial' };
const html = '<html><head><title>Administración de Empresas</title></head><body><h1>Administración de Empresas</h1><dl><dt>Título otorgado</dt><dd>Administrador(a) de Empresas</dd><dt>Nivel académico</dt><dd>Pregrado</dd><dt>Sede</dt><dd>Bogotá D.C.</dd><dt>Modalidad</dt><dd>Presencial</dd></dl><p>Código SNIES 1536</p></body></html>';
const url = 'https://www.uniandes.edu.co/es/programas/administracion-de-empresas';
test('extracts HTML labels, identity and XML sitemap without guessing source codes', () => {
  const page = extractPage(html,url); assert.equal(page.awardedTitle,program.awardedTitle); assert.deepEqual(page.snies,['1536']);
  assert.equal(matchPage(page,[program])[0].status,'VERIFIED');
  assert.deepEqual(sitemapLinks('<sitemapindex><sitemap><loc>https://example.edu.co/programas.xml</loc></sitemap></sitemapindex>').indexes,['https://example.edu.co/programas.xml']);
});
test('ambiguous rows, locations, dynamic fields and incomplete identity stay pending', () => {
  const page = extractPage(html,url);
  assert(matchPage(page,[program,{...program,sourceId:'upr9-nkiz:row-duplicate'}]).every(item=>item.status==='PENDING'));
  assert.equal(matchPage(page,[{...program,municipality:'Medellín'}])[0].status,'PENDING');
  assert.equal(matchPage({...page,dynamic:true},[program])[0].status,'PENDING');
  assert.equal(matchPage({...page,city:''},[program])[0].status,'PENDING');
});
test('identical titles in separate campuses resolve only the unique published location and modality', () => {
  const other={...program,sourceId:'upr9-nkiz:row-cali',municipality:'Cali'};
  const decisions=matchPage(extractPage(html,url),[program,other]);
  assert.equal(decisions.find(row=>row.sourceId===program.sourceId).status,'VERIFIED');
  assert.equal(decisions.find(row=>row.sourceId===other.sourceId).status,'PENDING');
  assert(matchPage(extractPage(html,url),[program,{...program,sourceId:'upr9-nkiz:row-same-campus'}]).every(row=>row.status==='PENDING'));
});
test('Uniandes chips and sibling labels verify published context without reading navigation', () => {
  const markup='<body><nav>Posgrado Virtual</nav><div class="header-program"><span>Presencial</span><span>Pregrado</span><h1>Administración de Empresas</h1></div><div><span>Sede</span><span>Bogotá D.C.</span></div><div><span>Título otorgado:</span><span>Administrador(a) de Empresas.</span></div></body>';
  const page=extractPage(markup,url);assert.equal(page.city,'Bogotá D.C.');assert.equal(page.level,'Pregrado');assert.equal(page.modality,'Presencial');
  assert.equal(matchPage(page,[program])[0].status,'VERIFIED');
});
test('related secondary headings and conflicting labels never verify another program', () => {
  const unrelated=html.replace('<h1>Administración de Empresas</h1>','<h1>Economía</h1><h2>Administración de Empresas</h2>').replace('Administrador(a) de Empresas','Economista');
  assert.equal(matchPage(extractPage(unrelated,url),[program])[0].status,'PENDING');
  const conflict=html.replace('</body>','<dt>Sede</dt><dd>Cali</dd></body>');
  assert.equal(extractPage(conflict,url).city,'');assert.equal(matchPage(extractPage(conflict,url),[program])[0].status,'PENDING');
});
test('published postgraduate degree is preserved and conflicting doctoral/master titles stay pending', () => {
  const markup='<body><div class="header-program"><span>Presencial</span><span>Doctorado</span><h1>Administración de Empresas</h1></div><dt>Título otorgado</dt><dd>Administrador(a) de Empresas</dd><dt>Sede</dt><dd>Bogotá D.C.</dd></body>';
  const page=extractPage(markup,url);assert.equal(page.educationLevel,'Doctorado');assert.equal(page.level,'Posgrado');
  assert.equal(matchPage(page,[{...program,academicLevel:'Posgrado',educationLevel:'Maestría'}])[0].status,'PENDING');
});
test('SNIES only verifies with an independently reviewed mapping and no contradictions', () => {
  const page = {...extractPage(html,url),city:'',level:'',modality:''};
  assert.equal(matchPage(page,[{...program,code:'1536'}])[0].status,'PENDING');
  assert.equal(matchPage(page,[program],{[program.sourceId]:'1536'})[0].status,'VERIFIED');
  assert.equal(matchPage({...page,city:'Cali'},[program],{[program.sourceId]:'1536'})[0].status,'PENDING');
  const other={...program,sourceId:'upr9-nkiz:row-other',municipality:'Cali'};
  assert(matchPage(page,[program,other],{[program.sourceId]:'1536',[other.sourceId]:'1536'}).every(item=>item.status==='PENDING'));
});
test('blocks private IPv4, IPv6, mapped and reserved networks, unsafe URLs and foreign canonical destinations', () => {
  for (const ip of ['127.0.0.1','10.0.0.1','192.168.1.1','169.254.169.254','100.64.1.1','::1','fc00::1','::ffff:127.0.0.1','2001:db8::1','0.0.0.0']) assert.equal(publicAddress(ip),false,ip);
  assert.equal(publicAddress('8.8.8.8'),true);
  for (const value of ['https://uniandes.edu.co.attacker.com/a','http://127.0.0.1/a','file:///a','https://user:pass@uniandes.edu.co/a','https://uniandes.edu.co:8080/a']) assert.throws(()=>approvedUrl(value,['uniandes.edu.co']));
  assert.equal(approvedUrl(url,['uniandes.edu.co']).hostname,'www.uniandes.edu.co');
});
test('actual transport rejects private DNS before opening a connection', async () => {
  await assert.rejects(fetchSafe('http://127.0.0.1',['127.0.0.1']),/privado o reservado bloqueado/);
});
test('honors robots groups, longest matches, wildcards and allow precedence', () => {
  const policy=robotsPolicy('User-agent: *\nDisallow: /private\nAllow: /private/public\nDisallow: /*?page=\nCrawl-delay: 2\nSitemap: https://a.edu.co/map.xml');
  assert.equal(policy.allows('/private/x'),false); assert.equal(policy.allows('/private/public/x'),true); assert.equal(policy.allows('/programas?page=2'),false); assert.equal(policy.delay,2);
  assert.equal(robotsPolicy('User-agent: Other\nDisallow: /\nUser-agent: EduPlanProgramLinks\nAllow: /').allows('/'),true);
});
test('collector isolates failed sites, bounds discovery and downgrades two plausible URLs', async () => {
  const client={policy:async()=>({sitemaps:[]}),get:async value=>({status:200,url:value,headers:{'content-type':value.endsWith('.xml')?'application/xml':'text/html'},text:value.endsWith('.xml')?`<urlset><url><loc>${url}</loc></url><url><loc>${url}-alternativa</loc></url></urlset>`:html})};
  const report=await collectInstitution({code:'1813',name:'Uniandes',website:'https://www.uniandes.edu.co',programs:[program]},{client,maxPages:4,maxSitemaps:1});
  assert(report.candidates.length>=2); assert(report.candidates.every(item=>item.status==='PENDING'));
  const missing=await collectInstitution({code:'1',name:'Sin web',website:'',programs:[program]}); assert.equal(missing.outcome,'NO_WEBSITE');
  assert.equal(summarize([report,missing],2).institutionsAttempted,2);
});
test('maintenance withdraws deleted/general pages but preserves temporary and dynamic failures', async () => {
  const candidate={...program,url,status:'VERIFIED',evidence:{matchedNames:[program.name]}};
  const client=response=>({get:async()=>response});
  assert.equal((await checkCandidate(candidate,client({status:404}))).status,'UNAVAILABLE');
  assert.equal((await checkCandidate(candidate,client({status:503}))).temporaryError,'HTTP 503');
  assert.equal((await checkCandidate(candidate,client({status:200,url:'https://uniandes.edu.co/',text:'<h1>Universidad</h1>'}))).status,'UNAVAILABLE');
  assert.equal((await checkCandidate(candidate,client({status:200,url,text:html}))).status,'VERIFIED');
  assert.equal((await checkCandidate({...candidate,status:'PENDING'},client({status:200,url,text:html}))).temporaryError,'El mantenimiento solo admite enlaces previamente verificados');
  assert.equal((await checkCandidate(candidate,client({status:200,url:'https://uniandes.edu.co/facultad',text:'<h1>Facultad de Administración de Empresas</h1>'}))).status,'UNAVAILABLE');
});
test('checkpoints resume a full catalog without repeating completed institutions', async () => {
  const out=await mkdtemp(join(tmpdir(),'eduplan-links-test-'));
  try {
    await saveJson(out+'/catalog.json',{checkedAt:'2026-09-30T00:00:00Z',institutions:[{code:'1',name:'Missing site',website:'',programs:[program]},{code:'2',name:'Missing site 2',website:'',programs:[program]}]});
    const options={out,maxPages:1,maxSitemaps:1,timeout:1000};
    assert.equal((await collect(options)).institutionsAttempted,2);
    const before=await readJson(out+'/report.json');
    assert.equal((await collect(options)).institutionsAttempted,2);
    const after=await readJson(out+'/report.json');
    assert.deepEqual(after.reports.map(item=>item.attemptedAt),before.reports.map(item=>item.attemptedAt));
    assert.equal(after.summary.recordsWithoutCandidate,2);
    await collect({...options,pending:true,resumeSince:'2020-01-01T00:00:00Z',concurrency:4});
    const resumed=await readJson(out+'/report.json');
    assert.deepEqual(resumed.reports.map(item=>item.attemptedAt),before.reports.map(item=>item.attemptedAt));
  } finally { await rm(out,{recursive:true,force:true}); }
});
