import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPreferences,validPreferences,profileCompleteness,sufficientPreferences } from '../src/utils/preferences.js';
import { getRecommendations } from '../src/services/recommendations.js';
import { getPreferences,putPreferences } from '../src/services/account.js';
import { feedbackKey,validDismissed,dismissRecommendation } from '../src/utils/recommendation-feedback.js';
const preferences={...emptyPreferences,academicLevel:'Pregrado',modality:'Virtual',mobility:'ANY'};
test('profile completeness measures six real sections, not match or interests alone',()=> {
  assert.equal(profileCompleteness(emptyPreferences,{areas:[],motivations:[]}),0);
  assert.equal(profileCompleteness(emptyPreferences,{areas:['Tecnología'],motivations:['Investigar']}),33);
  assert.equal(profileCompleteness(preferences,{areas:['Tecnología'],motivations:['Investigar']}),100);
  assert.equal(profileCompleteness({...preferences,mobility:'CITY'},{areas:['Tecnología'],motivations:['Investigar']}),83);
  assert.equal(sufficientPreferences({...preferences,mobility:'CITY'},{areas:['Tecnología']}),false);
  assert.equal(sufficientPreferences(preferences,{areas:['Tecnología']}),true);
  assert.equal(validPreferences({...preferences,modality:'Inventada'}),false);
});
test('explicit feedback is bounded, duplicate-safe and keyed by account, never changes weights',()=> {
  assert.notEqual(feedbackKey(1),feedbackKey(2));
  assert.deepEqual(dismissRecommendation(['upr9-nkiz:a'],'upr9-nkiz:a'),['upr9-nkiz:a']);
  assert.equal(dismissRecommendation(Array.from({length:200},(_,n)=>'upr9-nkiz:'+n),'upr9-nkiz:new').length,200);
  assert.deepEqual(dismissRecommendation([],'other:bad'),[]);assert.equal(validDismissed({}),false);
});
test('preferences service uses JWT, validates responses and never transmits account IDs',async t=> {
  const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=> { calls.push({url,options});return Response.json(preferences); });
  assert.deepEqual(await getPreferences('token-a'),preferences);
  await putPreferences(preferences,'token-b');
  assert.equal(calls[0].url,'/api/me/preferences');assert.equal(calls[0].options.headers.Authorization,'Bearer token-a');
  assert.equal(calls[1].options.headers.Authorization,'Bearer token-b');assert.deepEqual(JSON.parse(calls[1].options.body),preferences);
});
test('recommendation service sends only explicit preferences, not a token or account identity',async t=> {
  t.mock.method(globalThis,'fetch',async(url,options)=> {
    assert.equal(url,'/api/recommendations');const body=JSON.parse(options.body);assert.deepEqual(body.areas,['Tecnología']);assert.equal(body.limit,3);assert.equal(body.accountId,undefined);assert.equal(options.headers.Authorization,undefined);
    return Response.json({status:'NO_RESULTS',data:[]});
  });
  assert.equal((await getRecommendations({preferences,interests:{areas:['Tecnología']}},{limit:3})).status,'NO_RESULTS');
});
test('recommendations reject impossible scores and malformed program identities',async t=> {
  const row={score:101,reasons:[],matchedCriteria:[],unmatchedCriteria:[],missingInformation:[],program:{}};
  t.mock.method(globalThis,'fetch',async()=>Response.json({status:'OK',data:[row]}));
  await assert.rejects(()=>getRecommendations({preferences,interests:{areas:[]}}),/Puntuación/);
  row.score=100;await assert.rejects(()=>getRecommendations({preferences,interests:{areas:[]}}),/identidad/);
});
