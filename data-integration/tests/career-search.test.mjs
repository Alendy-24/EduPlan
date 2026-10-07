import test from 'node:test';
import assert from 'node:assert/strict';
import { careerWords, literalCareerMatch, relatedCareerMatch, fuzzyCareerMatch } from '../dist/utils/career-search.js';
import { selectPrograms, searchProgramOffers } from '../dist/services/program-catalog.js';

test('token boundaries separate career words and support only unrecognized autocomplete prefixes', () => {
  const known=new Set(['ARTE','ARTES','SISTEMAS','MEDICINA','MEDICION','QUIMICA','BIOQUIMICA','SOCIOLOGIA','PSICOLOGIA']);
  for(const [query,other] of [['arte','parte'],['sistemas','ecosistemas'],['química','bioquímica'],['sociología','psicosociología'],['medicina','medición']]) {
    assert.equal(literalCareerMatch(query,other,known,true),false,`${query}/${other}`);
    assert.equal(fuzzyCareerMatch(careerWords(query),other,known),false,`${query}/${other}`);
  }
  assert(literalCareerMatch('psico','Psicología',known,true));
  assert(!literalCareerMatch('sicología','Psicología',known));
  assert(fuzzyCareerMatch(careerWords('psciologia'),'Psicología',known));
});

test('a typo in one word cannot change a correctly spelled specialty in the same query', () => {
  const known=new Set(['MEDICINA','MEDICION','INTERNA','INGENIERIA','CIVIL','SISTEMAS']);
  assert(fuzzyCareerMatch(careerWords('medicina internna'),'Medicina Interna',known));
  assert(!fuzzyCareerMatch(careerWords('medicina internna'),'Medición Interna',known));
  assert(fuzzyCareerMatch(careerWords('ingeneria civil'),'Ingeniería Civil',known));
  assert(!fuzzyCareerMatch(careerWords('ingeneria civil'),'Ingeniería de Sistemas',known));
});

test('short generic names cannot drop the requested specialty', () => {
  for(const [query,candidate] of [['ingenieria civil','Ingeniería'],['maestria ingenieria sistemas','Maestría en Ingeniería'],['medicina veterinaria','Medicina']]) assert(!relatedCareerMatch(query,candidate));
  assert(relatedCareerMatch('Administración y Dirección de Empresas','Administración de Empresas'));
  assert(relatedCareerMatch('Ingeniería de Sistemas','Ingeniería de Sistemas y Computación'));
});

test('incomplete career searches keep results and counts while protecting recognized words', () => {
  const base={awardedTitle:'',knowledgeArea:'',institutionCode:'1701',institutionName:'Institución de prueba',academicLevel:'Pregrado',modality:'Virtual',municipality:'Bogotá',department:'Bogotá D.C.',educationLevel:'Universitaria',periodCount:'8',periodicity:'Semestral',status:'Activo',nameOrigin:'SNIES_NAME',reviewRequired:false};
  const programs=['Ingeniería de Sistemas','Ingeniería de Sistemas y Computación','Ingeniería Civil','Psicología','Química','Bioquímica','Medicina','Especialización en Medición Social'].map((name,i)=>({...base,name,sourceId:`upr9-nkiz:prefix-${i}`,code:String(i),sniesCode:String(i)}));
  for(const query of ['ingenieria de si','ingenieria de sis','ingenieria de sistem','ingenieria de sistemas']) {
    const filters={name:query,page:1,limit:12};
    assert.deepEqual(selectPrograms(programs,filters).map(p=>p.name),programs.slice(0,2).map(p=>p.name),query);
    assert.equal(searchProgramOffers(programs,filters).total,2);
  }
  assert.equal(selectPrograms(programs,{name:'psico',page:1,limit:12})[0].name,'Psicología');
  assert.deepEqual(selectPrograms(programs,{name:'quimica',page:1,limit:12}).map(p=>p.name),['Química']);
  assert.deepEqual(selectPrograms(programs,{name:'medicina',page:1,limit:12}).map(p=>p.name),['Medicina']);
  assert(literalCareerMatch('ingenieria de si','Ingeniería de Sistemas',new Set(['INGENIERIA','SI']),true));
});

test('career specificity holds across all combinations of level, modality and location', () => {
  const careers=['Ingeniería Civil','Ingeniería de Sistemas','Ingeniería Química','Psicología','Sociología','Derecho','Diseño','Economía','Administración de Empresas','Contaduría Pública','Enfermería','Odontología','Biología','Química','Educación','Arquitectura','Agronomía','Zootecnia'];
  const programs=[];
  for(const name of careers) for(const academicLevel of ['Pregrado','Posgrado']) for(const modality of ['Presencial','Virtual','A distancia']) for(const municipality of ['Bogotá','Medellín']) {
    const i=programs.length;
    programs.push({sourceId:`upr9-nkiz:matrix-${i}`,code:String(i),sniesCode:String(i),name,awardedTitle:'',knowledgeArea:name,institutionCode:'1701',institutionName:'Institución de prueba',academicLevel,modality,municipality,department:municipality==='Bogotá'?'Bogotá D.C.':'Antioquia',educationLevel:'Universitaria',periodCount:'8',periodicity:'Semestral',status:'Activo',nameOrigin:'SNIES_NAME',reviewRequired:false});
  }
  for(const name of careers) for(const academicLevel of ['Pregrado','Posgrado']) for(const modality of ['Presencial','Virtual','A distancia']) for(const municipality of ['Bogotá','Medellín']) {
    const filters={name,academicLevel,modality,municipality,page:1,limit:12};
    const rows=selectPrograms(programs,filters);
    assert(rows.length>0,name);
    for(const p of rows) {
      assert(careerWords(name).every(word=>careerWords(p.name).includes(word)),`${name}/${p.name}`);
      assert.equal(p.academicLevel,academicLevel);assert.equal(p.modality,modality);assert.equal(p.municipality,municipality);
    }
    assert.equal(searchProgramOffers(programs,filters).total,rows.length);
  }
});
