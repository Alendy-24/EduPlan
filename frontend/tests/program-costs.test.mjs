import test from 'node:test';
import assert from 'node:assert/strict';
import { officialCostSource, publishedAdditionalCosts } from '../src/utils/program-costs.js';
const program = { provenance:'real', comparisonState:'current', institutionWebsite:'https://www.unad.edu.co',educationLevel:'Universitario' };
test('dedicated tuition sources are available without a reported amount and match exact domains', () => {
  for (const domain of ['uninorte.edu.co', 'eafit.edu.co']) {
    assert.equal(officialCostSource({...program,institutionWebsite:`https://www.${domain}`}).dedicated,true);
    assert.equal(officialCostSource({...program,institutionWebsite:`https://${domain}.example.com`}).dedicated,false);
  }
});
test('official fees have their own source and year, with separate one-time costs', () => {
  const fees = publishedAdditionalCosts(program);
  assert.equal(fees.year,2026);
  assert.equal(fees.items[0].amount,170000);
  assert.equal(fees.items.find(item=>item.label==='Inscripción').amount,245000);
  assert.equal(publishedAdditionalCosts({...program,educationLevel:'Maestría'}).items[0].amount,925000);
  assert.equal(publishedAdditionalCosts({...program,educationLevel:'Tecnológica'}).items[0].amount,152000);
});
test('fees cannot leak across institutions, stale records, levels or demonstration data', () => {
  for (const changes of [{institutionWebsite:'https://unad.edu.co.example.com'},{institutionWebsite:'https://unilibre.edu.co'},{comparisonState:'error'},{provenance:'demo'},{educationLevel:'Técnica Profesional'}]) assert.equal(publishedAdditionalCosts({...program,...changes}),null);
  assert.equal(officialCostSource({...program,institutionWebsite:'https://www.unilibre.edu.co'}).dedicated,true);
  assert.equal(officialCostSource({...program,institutionWebsite:'https://example.edu.co'}).dedicated,false);
});
