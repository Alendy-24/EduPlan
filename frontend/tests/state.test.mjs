import test from 'node:test';
import assert from 'node:assert/strict';
import { readStorage, writeStorage, safeReturn } from '../src/utils/storage.js';
import { normalizeProgram, mergePrograms, addComparison, programHref, validStoredProgram } from '../src/utils/programs.js';
import { validInterests, interestProgress } from '../src/utils/interests.js';
import { websiteUrl } from '../src/utils/website.js';
const row = { sourceId: 'upr9-nkiz:row-a', code:'5', name:'Programa', institutionCode:'1101', institutionName:'Institución', periodCount:'10', periodicity:'Semestral' };
test('different source rows with the same program code survive pagination',()=>{
 const a=normalizeProgram(row), b=normalizeProgram({...row,sourceId:'upr9-nkiz:row-b'});
 assert.equal(mergePrograms([a],[a,b]).length,2);
 assert.notEqual(programHref(a),programHref(b));
 assert.equal(a.duration,'10 Semestral');
 assert.throws(()=>normalizeProgram({...row,sourceId:null}));
});
test('comparison is unique and limited to three rows',()=>{
 const a=normalizeProgram(row), b={...a,id:'b'}, c={...a,id:'c'}, d={...a,id:'d'};
 let items=addComparison([],a);items=addComparison(items,a);assert.equal(items.length,1);
 items=addComparison(addComparison(items,b),c);assert.equal(addComparison(items,d).length,3);
});
test('blocked storage and malformed data recover without crashing',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.deepEqual(readStorage(blocked,'key',[]),[]);assert.equal(writeStorage(blocked,'key',[]),false);
 assert.deepEqual(readStorage({getItem:()=>'{broken'},'key',[]),[]);
 assert.deepEqual(readStorage({getItem:()=>'{"areas":null,"motivations":[]}'},'key',{areas:[],motivations:[]},validInterests),{areas:[],motivations:[]});
});
test('progress means selected interest groups, not a recommendation score',()=>{
 assert.equal(interestProgress({areas:[],motivations:[]}),0);
 assert.equal(interestProgress({areas:['Tecnología'],motivations:[]}),50);
 assert.equal(interestProgress({areas:['Tecnología'],motivations:['Investigar']}),100);
 assert.equal(validInterests({areas:['unknown'],motivations:[]}),false);
});
test('return paths cannot redirect outside the app or back into auth',()=>{
 for(const path of ['https://example.org','//example.org','/login','/register?x=1','/\\example.org']) assert.equal(safeReturn(path),'/dashboard');
 assert.equal(safeReturn('/perfil?tab=intereses'),'/perfil?tab=intereses');
});
test('only plausible public website URLs become official links',()=>{
 assert.equal(websiteUrl('javascript:alert(1)'),null);assert.equal(websiteUrl('person@example.org'),null);
 assert.equal(websiteUrl('www.example.org'),'https://www.example.org/');
});
test('corrupt comparison summaries cannot become rendered objects',()=>{
 const program=normalizeProgram(row);assert.equal(validStoredProgram(program),true);
 assert.equal(validStoredProgram({...program,institution:{unexpected:true}}),false);
 assert.equal(validStoredProgram({...program,sourceId:undefined}),false);
 assert.equal(normalizeProgram({...row,name:{unexpected:true}}).recordQuality,'incomplete');
 assert.equal(normalizeProgram({...row,name:{unexpected:true}}).name,'Nombre del programa no disponible');
});
