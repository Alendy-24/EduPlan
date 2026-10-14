import { readFileSync } from 'node:fs';
import type { Program } from '../models/program.js';

export interface InstitutionalPrice {
  sniesCode: string; institutionCode: string; modality: string; municipality: string;
  amount: number; source: string; checkedAt: string; priceYear: number;
  billingPeriod: 'SEMESTER' | 'FIRST_ENROLLMENT'; note: string; sourcePage?: number;
}
export interface InstitutionalPriceIndex { schemaVersion: number; records: InstitutionalPrice[] }
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const key = (p: Pick<InstitutionalPrice, 'sniesCode' | 'institutionCode' | 'modality' | 'municipality'>) =>
  JSON.stringify([p.sniesCode, p.institutionCode, fold(p.modality), fold(p.municipality)]);

export function createInstitutionTuitionResolver(index: InstitutionalPriceIndex) {
  if (index.schemaVersion !== 1) throw new Error('Catálogo de tarifas institucionales inválido');
  const records = new Map<string, InstitutionalPrice[]>();
  for (const record of index.records) {
    if (!/^https:\/\/[^/]+\.edu\.co\//.test(record.source) || !Number.isSafeInteger(record.amount)
      || record.amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(record.checkedAt)
      || !Number.isInteger(record.priceYear) || !['SEMESTER', 'FIRST_ENROLLMENT'].includes(record.billingPeriod)
      || ![record.sniesCode, record.institutionCode, record.modality, record.municipality, record.note].every(s => typeof s === 'string' && s.trim())) {
      throw new Error('Tarifa institucional sin contexto, monto o fuente válida');
    }
    const id = key(record), values = records.get(id) ?? [];
    values.push(record); records.set(id, values);
  }
  return (program: Pick<Program, 'sniesCode' | 'institutionCode' | 'modality' | 'municipality'>, year = new Date().getUTCFullYear()): Program['tuition'] => {
    if (!program.sniesCode) return undefined;
    const matches = (records.get(key({...program, sniesCode: program.sniesCode})) ?? []).filter(r => r.priceYear === year);
    // Conflicting records must be reviewed instead of selecting a price arbitrarily.
    if (matches.length !== 1) return undefined;
    const r = matches[0];
    return { amount:r.amount, currency:'COP', basis:'INSTITUTION_PUBLISHED', source:r.source,
      sourceField:'OFFICIAL_TUITION_SCHEDULE', importedAt:r.checkedAt, priceYear:r.priceYear,
      billingPeriod:r.billingPeriod, note:r.note, sourcePage:r.sourcePage };
  };
}
const index = JSON.parse(readFileSync(new URL('../../data/institution-tuition.json', import.meta.url), 'utf8'));
export const resolveInstitutionTuition = createInstitutionTuitionResolver(index);
