import { readFileSync } from 'node:fs';
import type { Program } from '../models/program.js';

type TuitionRecord = [string, string, string, string, number];
interface TuitionIndex { schemaVersion: number; source: string; field: string; importedAt: string; records: TuitionRecord[] }
const index: TuitionIndex = JSON.parse(readFileSync(new URL('../../data/snies-tuition.json', import.meta.url), 'utf8'));
const fold = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export function createTuitionResolver(data: TuitionIndex) {
  if (data.schemaVersion !== 1) throw new Error('Formato de costos SNIES no válido');
  const key = (code: string, institution: string, modality: string, city: string) => JSON.stringify([code, institution, fold(modality), fold(city)]);
  const records = new Map<string, Set<number>>();
  for (const [code, institution, modality, city, amount] of data.records) {
    if (!Number.isFinite(amount) || amount < 0) continue;
    const id = key(code, institution, modality, city);
    const amounts = records.get(id) ?? new Set<number>();
    amounts.add(amount); records.set(id, amounts);
  }
  return (program: Pick<Program, 'sniesCode' | 'institutionCode' | 'modality' | 'municipality'>): Program['tuition'] => {
    if (!program.sniesCode || !program.institutionCode || !program.modality || !program.municipality) return undefined;
    const amounts = records.get(key(program.sniesCode, program.institutionCode, program.modality, program.municipality));
    // Conflicting campus records must not become an arbitrary price.
    if (!amounts || amounts.size !== 1) return undefined;
    return { amount: [...amounts][0], currency: 'COP', basis: 'NEW_STUDENT_REPORTED', source: data.source,
      sourceField: data.field, importedAt: data.importedAt, priceYear: null };
  };
}
export const resolveTuition = createTuitionResolver(index);
