import test from 'node:test';
import assert from 'node:assert/strict';
import { getProgramLink, getProgramLinks } from '../src/services/program-links.js';
import { withOfficialProgram, programItem, comparisonSnapshot } from '../src/utils/programs.js';

const program = { id:'upr9-nkiz:row-arq',sourceId:'upr9-nkiz:row-arq',code:'11',name:'ARQUITECTO',awardedTitle:'ARQUITECTO',rawName:'Bogotá D.C.',nameOrigin:'AWARDED_TITLE',reviewRequired:true,provenance:'real' };
const link = { sourceId:program.sourceId,status:'VERIFIED',url:'https://uniandes.edu.co/es/programas/arquitectura',officialName:'Arquitectura',checkedAt:'2026-09-30T00:00:00Z' };
test('verified official name precedes awarded title without changing catalog evidence or identity', () => {
  const value=withOfficialProgram(program,link);
  assert.equal(value.name,'Arquitectura');assert.equal(value.awardedTitle,'ARQUITECTO');assert.equal(value.rawName,'Bogotá D.C.');assert.equal(value.nameOrigin,'OFFICIAL_PAGE');assert.equal(value.catalogName,'ARQUITECTO');assert.equal(value.sourceId,program.sourceId);
  assert.equal(programItem(value).name,'Arquitectura');assert.equal(comparisonSnapshot(value).awardedTitle,'ARQUITECTO');
  for(const candidate of [{...link,status:'PENDING'}, {...link,sourceId:'upr9-nkiz:other'}, {...link,officialName:''}]) assert.equal(withOfficialProgram(program,candidate),program);
});
test('public metadata validates exact source identity and preserves the institution fallback on failure', async t => {
  t.mock.method(globalThis,'fetch',async()=>Response.json(link));assert.equal((await getProgramLink(program.sourceId)).officialName,'Arquitectura');t.mock.restoreAll();
  t.mock.method(globalThis,'fetch',async()=>Response.json({...link,sourceId:'upr9-nkiz:other'}));await assert.rejects(getProgramLink(program.sourceId),/no válida/);t.mock.restoreAll();
  t.mock.method(globalThis,'fetch',async()=>new Response('',{status:503}));await assert.rejects(getProgramLink(program.sourceId),/No pudimos/);
});
test('batch lookup is bounded and rejects missing, duplicate or unsolicited source rows', async t => {
  t.mock.method(globalThis,'fetch',async url=>{assert.match(url,/program-links\/batch\?/);return Response.json({data:[link]});});assert.equal((await getProgramLinks([program.sourceId,program.sourceId])).length,1);t.mock.restoreAll();
  await assert.rejects(getProgramLinks(Array.from({length:101},(_,i)=>String(i))),/Máximo 100/);
  for(const data of [[],[{...link,sourceId:'upr9-nkiz:other'}],[link,link]]) {
    t.mock.method(globalThis,'fetch',async()=>Response.json({data}));await assert.rejects(getProgramLinks([program.sourceId]));t.mock.restoreAll();
  }
});
