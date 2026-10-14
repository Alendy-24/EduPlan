import test from 'node:test';
import assert from 'node:assert/strict';
import { extractUnabTuition, discoverProgramUrls, mergeCollectedPrices, extractJaverianaCaliTuition, discoverJaverianaCaliUrls, extractSenaFreeTraining } from '../tools/tuition-collectors.mjs';
const offer=['106109','1823','INGENIERIA INDUSTRIAL','INGENIERO INDUSTRIAL','Pregrado','Presencial','Bucaramanga'];
const source='https://unab.edu.co/programas/ingenieria-industrial/';
const html=`<ul><li>Registro Snies – 106109</li></ul>
<div><h4 class="et_pb_module_header">Modalidad</h4><div class="et_pb_blurb_description"><p>Presencial</p></div></div>
<div><h4 class="et_pb_module_header">Valor primer ingreso</h4><div class="et_pb_blurb_description"><h4>$ 7.265.700 Valor matrícula para estudiantes de primer ingreso (no incluye pecuniarios, vigencia 2026)</h4><p>Valor inglés $ 792.900</p></div></div>`;
test('collector reads only explicitly labelled first-enrollment tuition, year and exact SNIES identity',()=>{
  const {record}=extractUnabTuition(html,source,[offer],'2026-10-14');
  assert.equal(record.amount,7265700);assert.equal(record.billingPeriod,'FIRST_ENROLLMENT');assert.equal(record.priceYear,2026);
  assert.equal(record.sniesCode,offer[0]);assert.equal(record.contentSha256.length,64);
});
test('collector rejects stale, ambiguous, untrusted and changed templates instead of guessing',()=>{
  for(const [document,url,names] of [
    [html.replace('vigencia 2026','vigencia 2025'),source,[offer]],
    [html.replace('vigencia 2026','2026'),source,[offer]],
    [html.replace('$ 7.265.700','$ 7.265.700 o $ 8.000.000'),source,[offer]],
    [html.replace('>Presencial<','>Virtual<'),source,[offer]],
    [html,source,[offer,[...offer.slice(0,6),'Cali']]],
    [html,'https://unab.edu.co.evil.com/programas/foo/',[offer]],
    [html.replace('Valor primer ingreso','Costo por crédito'),source,[offer]],
    [html.replace('Valor matrícula','Valor estimado de matrícula'),source,[offer]],
    [html.replace('Valor matrícula','Valor matrícula desde'),source,[offer]],
    [html.replace('Valor matrícula','Valor matrícula con descuento'),source,[offer]],
  ]) assert.equal(extractUnabTuition(document,url,names,'2026-10-14').record,undefined);
});
test('discovery never follows off-domain, non-program or duplicate URLs',()=>{
  const xml=`<urlset><url><loc>${source}</loc></url><url><loc>${source}</loc></url><url><loc>https://evil.com/programas/foo/</loc></url></urlset>`;
  assert.deepEqual(discoverProgramUrls(xml),[source]);
});
test('changed prices are quarantined while independent offers continue to update',()=>{
  const record=extractUnabTuition(html,source,[offer],'2026-10-14').record;
  const merged=mergeCollectedPrices([record],[{...record,amount:8000000},{...record,sniesCode:'other'}]);
  assert.equal(merged.conflicts.length,1);assert.equal(merged.records.length,1);assert.equal(merged.records[0].sniesCode,'other');
  const duplicate=mergeCollectedPrices([record,{...record,amount:8000000}],[record]);
  assert.equal(duplicate.records.length,0);assert.equal(duplicate.conflicts.length,1);
});
const jcSource='https://www.javerianacali.edu.co/programas/carreras/enfermeria';
const jcOffer=['106123','1702','ENFERMERÍA','ENFERMERA(O)','Pregrado','Presencial','Santiago de Cali'];
const jcHtml=`<div><h6>Reg. SNIES</h6><p>106123</p></div><li><p>Modalidad</p><p>Presencial</p></li><li class="paragraph--type--price"><p>Costo semestre 2026</p><div class="tab-pane" id="cop"><p>$ 9.864.000*</p></div><div class="price-tags"><span data-target="#cop">COP</span></div></li><p>No incluyen la Estampilla ProCultura</p>`;
test('Javeriana Cali extracts the semester price in COP, not an enrollment fee or another campus',()=>{
  const result=extractJaverianaCaliTuition(jcHtml,jcSource,[jcOffer],'2026-10-14');
  assert.equal(result.record.amount,9864000);assert.equal(result.record.billingPeriod,'SEMESTER');
  for(const html of [jcHtml.replace('semestre','inscripción'),jcHtml.replace('2026','2025'),jcHtml.replace('>COP<','>USD<'),jcHtml.replace('>Presencial<','>Virtual<')])assert.equal(extractJaverianaCaliTuition(html,jcSource,[jcOffer],'2026-10-14').record,undefined);
  assert.equal(extractJaverianaCaliTuition(jcHtml,jcSource,[[...jcOffer.slice(0,1),'1701',...jcOffer.slice(2)]],'2026-10-14').record,undefined);
  assert.deepEqual(discoverJaverianaCaliUrls(`<a href="/programas/carreras/enfermeria">Carrera</a><a href="https://evil.com/programas/carreras/otra">Otra</a>`),[jcSource]);
});
test('free SENA tuition requires both a universal official policy and explicit current-year corroboration',()=>{
  const policy='<p>Todos los servicios del SENA son públicos gratuitos y no requieren intermediarios.</p>';
  const confirmation='<article>Oferta Presencial y a Distancia 2026. Todos los procesos de registro, inscripción y acceso a la formación son completamente gratuitos.</article>';
  const sena=['1','9110','TECNOLOGÍA','TECNÓLOGO','Pregrado','Presencial','Bogotá'];
  const result=extractSenaFreeTraining(policy,confirmation,[sena,offer],'2026-10-14');
  assert.equal(result.records.length,1);assert.equal(result.records[0].amount,0);assert.equal(result.records[0].billingPeriod,'FREE_TRAINING');
  for(const [p,c] of [['Puede ser gratuito',confirmation],[policy,confirmation.replace('2026','2025')],[policy,confirmation.replace('completamente gratuitos','según requisitos')]])assert.equal(extractSenaFreeTraining(p,c,[sena],'2026-10-14').records.length,0);
});
