import test from 'node:test';
import assert from 'node:assert/strict';
import { getSaved,putSaved,deleteSaved,getInterests,putInterests,getAccount,putAccount } from '../src/services/account.js';
import { validSavedItem,mergeRemoteSaved,snapshotChanges } from '../src/utils/saved.js';
const item={id:'program-upr9-nkiz:row~1',type:'program',name:'Programa',href:'/programas/11?registro=row~1',snapshot:{status:'Activo',city:'Bogotá'}};
test('pending mutations merge with remote data without resurrecting deletions or copying other owners',()=>{
 const result=mergeRemoteSaved([item,{...item,id:'remote'}],[{id:item.id,action:'delete'},{id:'local',action:'put',item:{...item,id:'local'}}]);
 assert.deepEqual(result.map(value=>value.id),['remote','local']);
 assert(validSavedItem({...item,snapshot:null}));assert(!validSavedItem({...item,snapshot:{nested:{}}}));
 assert(!validSavedItem({...item,href:'//outside.example'}));
});
test('saved summaries detect actual changes and leave unavailable snapshots honest',()=>{
 assert.deepEqual(snapshotChanges({status:'Activo',city:'Bogotá'},{status:'Inactivo',city:'Bogotá'}),[{key:'status',label:'Estado',before:'Activo',after:'Inactivo'}]);
 assert.deepEqual(snapshotChanges(null,{status:'Activo'}),[]);
});
test('account requests send bearer auth, opaque identity and explicit mutations without credentials',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return options.method==='DELETE'?new Response(null,{status:204}):Response.json(url.endsWith('/interests')?{areas:['Tecnología'],motivations:['Investigar'],updatedAt:null}:options.method==='GET'?{data:[item]}:item);});
 assert.equal((await getSaved('test-token'))[0].id,item.id);
 await putSaved(item,'test-token');await deleteSaved(item.id,'test-token');
 assert.equal((await getInterests('test-token')).areas[0],'Tecnología');await putInterests({areas:[],motivations:[]},'test-token');
 assert(calls.every(call=>call.options.headers.Authorization==='Bearer test-token'));
 assert(calls[1].url.includes(encodeURIComponent(item.id)));
 assert.deepEqual(JSON.parse(calls[1].options.body),{type:item.type,name:item.name,href:item.href,snapshot:item.snapshot});
 assert(calls.every(call=>!call.options.body?.includes('password')));
});
test('account errors reject malformed responses and invalidate unauthorized sessions',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({data:{}}));await assert.rejects(getSaved('token'),/no es válida/);
 t.mock.restoreAll();
 const events=[];Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:event=>events.push(event.type)}});t.after(()=>{delete globalThis.window;});
 t.mock.method(globalThis,'fetch',async()=>new Response(null,{status:401}));
 await assert.rejects(getSaved('token'),/sesión venció/);assert.deepEqual(events,['eduplan-auth-rejected']);
});
test('account details are validated and only editable fields are sent',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return Response.json({userId:7,name:'Ana',email:'ana@example.test',phone:'3101234567'});});
 assert.equal((await getAccount('token')).name,'Ana');
 assert.equal((await putAccount({name:'Ana',phone:'3101234567'},'token')).phone,'3101234567');
 assert.deepEqual(JSON.parse(calls[1].options.body),{name:'Ana',phone:'3101234567'});
 assert(calls.every(call=>call.url==='/api/me/account'&&call.options.headers.Authorization==='Bearer token'));
 t.mock.restoreAll();
 t.mock.method(globalThis,'fetch',async()=>Response.json({name:'Ana'}));
 await assert.rejects(getAccount('token'),/no es válida/);
});
