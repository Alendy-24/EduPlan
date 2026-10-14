// Import reviewed institutional prices without scraping during user requests.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createInstitutionTuitionResolver } from '../dist/services/institution-tuition.js';

const input = process.argv[2];
if (!input) throw new Error('Uso: npm run tuition:import -- archivo-revisado.json');
const incoming = JSON.parse(readFileSync(input, 'utf8'));
createInstitutionTuitionResolver(incoming);
if (!incoming.records.length) throw new Error('El archivo revisado está vacío');
const file = new URL('../data/institution-tuition.json', import.meta.url);
const current = JSON.parse(readFileSync(file, 'utf8'));
const names = JSON.parse(readFileSync(new URL('../data/snies-program-names.json', import.meta.url), 'utf8'));
const fold = s => s.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const key = r => JSON.stringify([r.sniesCode, r.institutionCode, fold(r.modality), fold(r.municipality), r.priceYear]);
const merged = new Map(current.records.map(r => [key(r), r]));
const seen = new Set();
for (const r of incoming.records) {
  if (seen.has(key(r))) throw new Error('Tarifas duplicadas en el archivo revisado');
  seen.add(key(r));
  if (!names.records.some(n => n[0] === r.sniesCode && n[1] === r.institutionCode && fold(n[5]) === fold(r.modality) && fold(n[6]) === fold(r.municipality))) {
    throw new Error(`Oferta no encontrada en el índice oficial: ${r.sniesCode}`);
  }
  if (merged.has(key(r)) && merged.get(key(r)).checkedAt > r.checkedAt) throw new Error('No se reemplaza una revisión reciente por otra anterior');
  merged.set(key(r), r);
}
const result = {schemaVersion:1, records:[...merged.values()]};
createInstitutionTuitionResolver(result);
const temporary = new URL('../data/institution-tuition.json.tmp', import.meta.url);
writeFileSync(temporary, JSON.stringify(result, null, 2) + '\n', {flag:'wx'});
renameSync(temporary, file);
console.log(`${incoming.records.length} tarifas revisadas importadas; ${result.records.length} tarifas en total.`);
