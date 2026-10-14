import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolveProgramImage } from '../src/utils/program-images.js';
import { programImages } from '../src/data/program-images.js';

test('the two mechanical engineering offers use the same relevant photo despite conflicting or missing NBC', () => {
  const a={name:'INGENIERIA MECANICA',nameOrigin:'SNIES_NAME',institutionName:'UNIVERSIDAD SIMON BOLIVAR',knowledgeArea:'No disponible'};
  const b={name:'INGENIERÍA MECÁNICA',nameOrigin:'SNIES_NAME',institutionName:'UNIVERSIDAD ESCUELA COLOMBIANA DE INGENIERIA',knowledgeArea:'Ingeniería mecánica y afines'};
  assert.equal(resolveProgramImage(a).src,programImages.mecanica.src);
  assert.equal(resolveProgramImage(b).src,programImages.mecanica.src);
  assert.notEqual(resolveProgramImage(a).src,programImages.tecnologia.src);
});

test('engineering specialties have distinct photos and word boundaries avoid unrelated disciplines', () => {
  for(const [name,key] of [['Ingeniería de Sistemas','tecnologia'],['Ingeniería Mecánica','mecanica'],['Maestría en Ingeniería - Mecánica','mecanica'],['Ingeniería Civil','civil'],['Ingeniería Electrónica','electronica'],['Ingeniería Industrial','industrial'],['Arquitectura','civil'],['Medicina Veterinaria','agro'],['Especialización en Derecho Civil','sociales'],['Tecnología en Enfermería','salud']]) assert.equal(resolveProgramImage({name,nameOrigin:'SNIES_NAME',knowledgeArea:'Administración'}).src,programImages[key].src,name);
});

test('Bioengineering has a dedicated real photograph shared across institutions', () => {
  const a=resolveProgramImage({name:'BIOINGENIERIA',nameOrigin:'SNIES_NAME',knowledgeArea:'No disponible',institutionCode:'1'});
  const b=resolveProgramImage({name:'Bioingeniería',nameOrigin:'SNIES_NAME',knowledgeArea:'Ingeniería de sistemas telemática y afines',institutionCode:'2'});
  assert.equal(a.src,programImages.bioingenieria.src);
  assert.equal(a.src,b.src);
  assert.notEqual(a.src,programImages.ciencias.src);
  assert.notEqual(a.src,programImages.general.src);
});

test('every official program name keeps its photo across institutions and conflicting metadata', () => {
  const index=JSON.parse(readFileSync(new URL('../../data-integration/data/snies-program-names.json',import.meta.url)));
  for(const row of index.records) {
    const p={name:row[2],nameOrigin:'SNIES_NAME'};
    const expected=resolveProgramImage(p).src;
    for(const knowledgeArea of ['Ingeniería de sistemas telemática y afines','Medicina','Bellas artes','']) assert.equal(resolveProgramImage({...p,knowledgeArea,area:knowledgeArea,broadKnowledgeArea:'Ciencias sociales y humanas',institutionCode:'9999'}).src,expected,row[2]);
  }
});

test('all configured photographs exist locally and unknown disciplines keep a neutral photo', () => {
  for(const photo of Object.values(programImages)) assert(existsSync(new URL('../public'+photo.src,import.meta.url)));
  assert.equal(resolveProgramImage({name:'Programa sin asociación visual revisada',nameOrigin:'SNIES_NAME',knowledgeArea:'Ingeniería de sistemas telemática y afines'}).src,programImages.general.src);
  assert.equal(resolveProgramImage({name:'Nombre del programa no disponible',nameOrigin:'UNAVAILABLE',area:'Ingeniería mecánica y afines'}).src,programImages.mecanica.src);
});
