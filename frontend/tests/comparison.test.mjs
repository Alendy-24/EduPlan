import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonDuration, comparisonRowState, comparisonValue, comparisonLocation, validComparisonWorkspace, priorityRow, comparisonNoteKey, comparisonHighlights, comparisonShareText } from '../src/utils/comparison.js';
import { comparisonSnapshot, validStoredProgram } from '../src/utils/programs.js';
test('comparison differences ignore accent and case but keep missing values visible',()=>{
  const row={get:program=>program.city};
  assert.equal(comparisonRowState(row,[{city:'Bogotá'},{city:' BOGOTA '}]).same,true);
  assert.equal(comparisonRowState(row,[{city:'Bogotá'},{city:'Medellín'}]).differs,true);
  assert.equal(comparisonRowState(row,[{city:''},{city:''}]).same,false);
  assert.equal(comparisonRowState(row,[{city:'Bogotá'},{city:''}]).same,false);
  assert.equal(comparisonRowState(row,[{city:'Bogotá'}]).same,false);
  assert.equal(comparisonValue('No disponible'),'');
  assert.equal(comparisonLocation({city:'Bogotá D.C.',department:'Bogotá D.C.'}),'Bogotá D.C.');
  assert.equal(comparisonLocation({city:'Medellín',department:'Antioquia'}),'Medellín · Antioquia');
});
test('duration uses the published periods without guessing a calendar or the unit',()=>{
  assert.equal(comparisonDuration({periodCount:'8',periodicity:'Semestral',duration:'8 Semestral'}),'8 semestres');
  assert.equal(comparisonDuration({periodCount:'1',periodicity:'Anual'}),'1 año');
  assert.equal(comparisonDuration({duration:'5 años'}),'5 años');
  assert.equal(comparisonDuration({periodCount:'8',periodicity:'Desconocida'}),'');
  assert.equal(comparisonDuration({periodCount:'8',periodicity:'NA',duration:'8 NA'}),'');
});
test('comparison snapshots retain decision information and stay compatible with old selections',()=>{
  const old={id:'upr9-nkiz:a',sourceId:'upr9-nkiz:a',code:'11',name:'Medicina',provenance:'real'};
  assert(validStoredProgram(old));
  const program={...old,educationLevel:'Universitaria',department:'Antioquia',credits:'180',periodCount:'10',periodicity:'Semestral',institutionWebsite:'https://universidad.edu.co',institutionCampus:'Principal',institutionSector:'Oficial',area:'Medicina',sniesCode:'123'};
  const snapshot=comparisonSnapshot(program);
  assert.equal(snapshot.credits,'180'); assert.equal(snapshot.department,'Antioquia'); assert.equal(snapshot.institutionWebsite,program.institutionWebsite);
  assert(validStoredProgram(snapshot)); assert.equal(validStoredProgram({...snapshot,credits:{invalid:true}}),false);
});

test('workspace accepts bounded personal notes and known priorities only',()=>{
  assert(validComparisonWorkspace({priorities:['location','formation'],notes:{'offer:abc':'Matrícula por confirmar'}}));
  assert.equal(validComparisonWorkspace({priorities:['ranking'],notes:{}}),false);
  assert.equal(validComparisonWorkspace({priorities:['location','location'],notes:{}}),false);
  assert.equal(validComparisonWorkspace({priorities:[],notes:{a:'x'.repeat(2001)}}),false);
  assert.equal(validComparisonWorkspace({priorities:[],notes:[]}),false);
  assert(priorityRow('awardedTitle',['formation']));
  assert.equal(priorityRow('duration',['modality']),false);
  assert.equal(comparisonNoteKey({id:'upr9-nkiz:a',offerId:'offer:abc'}),'offer:abc');
  assert(validComparisonWorkspace({priorities:[],notes:{},favorite:'upr9-nkiz:a'}));
  assert.equal(validComparisonWorkspace({priorities:[],notes:{},favorite:{id:'a'}}),false);
});

test('highlights prioritize selected criteria without inventing differences from missing data',()=>{
  const programs=[{modality:'Presencial',city:'Bogotá',awardedTitle:'Ingeniero',periodCount:'8',periodicity:'Semestral'},
    {modality:'Virtual',city:'Medellín',awardedTitle:'Ingeniera',periodCount:'10',periodicity:'Semestral'},
    {modality:'Presencial',city:'Cali',awardedTitle:'',periodCount:'8',periodicity:'Semestral'}];
  const highlights=comparisonHighlights(programs,['formation']);
  assert.equal(highlights[0].key,'awardedTitle');
  assert.equal(highlights[0].values[2],'');
  assert.deepEqual(highlights.find(row=>row.key==='duration').values,['8 semestres','10 semestres','8 semestres']);
  assert.deepEqual(comparisonHighlights([{city:'Bogotá'},{city:''}]),[]);
  assert.deepEqual(comparisonHighlights([{city:'Bogotá'},{city:'BOGOTA'}]),[]);
  assert.deepEqual(comparisonHighlights([programs[0]]),[]);
});

test('shared summaries preserve offering identity, unknowns and fallback context without personal data',()=>{
  const program={id:'upr9-nkiz:a',sourceId:'upr9-nkiz:a',code:'11',name:'Sistemas',institution:'Universidad Alfa',provenance:'real',comparisonState:'missing',periodCount:'8',periodicity:'Semestral',notes:'Nota privada',favorite:true};
  const text=comparisonShareText([program],'https://eduplan.example');
  assert(text.includes('Duración publicada: 8 semestres'));
  assert(text.includes('Créditos académicos: Por confirmar'));
  assert(text.includes('Información guardada o pendiente'));
  assert(text.includes('https://eduplan.example/programas/11?registro=upr9-nkiz%3Aa'));
  assert(!text.includes('Nota privada'));
  assert(!text.includes('favorite'));
  assert(comparisonShareText([{name:'Demo',provenance:'demo'}],'https://eduplan.example').includes('Datos ficticios'));
});
