import { readFileSync } from 'node:fs';

type OfficialRecord = [string, string, string, string, string, string, string];
interface NameIndex { schemaVersion: number; source: string; field: string; importedAt: string; records: OfficialRecord[] }
const index: NameIndex = JSON.parse(readFileSync(new URL('../../data/snies-program-names.json', import.meta.url), 'utf8'));
if (index.schemaVersion !== 2) throw new Error('El índice SNIES requiere una nueva importación');
const fold = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
const cityKey = (text: string) => fold(text).replace(/[\p{P}\p{Z}]/gu, '');
interface PublishedContext { institutionCode: string; awardedTitle: string; academicLevel: string; modality: string; municipality: string }
export function createSniesResolver(data: NameIndex) {
  const contexts = new Map<string, OfficialRecord[]>();
  const key = (institution: string, title: string, level: string, modality: string) => JSON.stringify([institution.trim(), fold(title), fold(level), fold(modality)]);
  for (const row of data.records) {
    const contextKey = key(row[1], row[3], row[4], row[5]);
    const values = contexts.get(contextKey) ?? []; values.push(row); contexts.set(contextKey, values);
  }
  return (context: PublishedContext) => {
    if (![context.institutionCode, context.awardedTitle, context.academicLevel, context.modality].every(value => value.trim() && !['NA', 'N/A'].includes(fold(value)))) return null;
    let candidates = contexts.get(key(context.institutionCode, context.awardedTitle, context.academicLevel, context.modality)) ?? [];
    if (new Set(candidates.map(row => row[2])).size > 1 && context.municipality.trim()) {
      candidates = candidates.filter(row => cityKey(row[6]) === cityKey(context.municipality));
    }
    const names = new Set(candidates.map(row => row[2]));
    if (names.size !== 1) return null;
    const codes = new Set(candidates.map(row => row[0]));
    return { name: [...names][0], sniesCode: codes.size === 1 ? [...codes][0] : '', source: data.source, field: data.field, importedAt: data.importedAt };
  };
}
// codigoprograma is mis-mapped in Socrata (e.g. 11 for unrelated Bogotá programs).
// Match literal official titles as identifiers with independent institution/level/modality;
// the display name itself is always read from NOMBRE_DEL_PROGRAMA, never derived.
export const resolveOfficialProgramName = createSniesResolver(index);
