import { careerWords, fuzzyCareerMatch, literalCareerMatch } from '../utils/career-search.js';
import { readFileSync } from 'node:fs';
import { municipalityKey } from '../utils/municipality-key.js';

type IdentityDetail = [string, string, string, string, string, string, string, string];
type OfficialRecord = [string, string, string, string, string, string, string];
interface NameIndex { schemaVersion: number; source: string; field: string; importedAt: string; records: OfficialRecord[]; activeRecords?: OfficialRecord[]; activeDetails?: IdentityDetail[] }
const index: NameIndex = JSON.parse(readFileSync(new URL('../../data/snies-program-names.json', import.meta.url), 'utf8'));
if (index.schemaVersion !== 2) throw new Error('El índice SNIES requiere una nueva importación');
const knownCareerWords = new Set(index.records.flatMap(record => careerWords(record[2]).concat(careerWords(record[3]))));
// Repeated vocabulary protects correct words in mixed typo queries. Isolated
// published spelling errors remain correctable when another query word is unknown.
const wordSupport = new Map<string, number>();
for (const record of index.records) for (const word of new Set([...careerWords(record[2]), ...careerWords(record[3])])) wordSupport.set(word,(wordSupport.get(word) ?? 0) + 1);
export const commonCareerWords = new Set([...wordSupport].filter(([,count]) => count >= 3).map(([word]) => word));
const fold = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
const cityKey = municipalityKey;
interface PublishedContext { institutionCode: string; awardedTitle: string; academicLevel: string; modality: string; municipality: string; status?: string; educationLevel?: string; credits?: string; periodCount?: string; periodicity?: string }
export function createSniesResolver(data: NameIndex) {
  const contexts = new Map<string, OfficialRecord[]>();
  const active = new Set((data.activeRecords ?? []).map(row => JSON.stringify(row)));
  const detailKey = (code: string, institution: string, mode: string, city: string) => JSON.stringify([code, institution, fold(mode), cityKey(city)]);
  const integer = (value: string) => /^\d+(?:\.0+)?$/.test(value.trim()) && Number(value) > 0 ? String(Number(value)) : '';
  const formation = (value: string) => ({ UNIVERSITARIA:'UNIVERSITARIO', TECNOLOGICA:'TECNOLOGICO' }[fold(value)] ?? fold(value));
  const signature = (level: string, credits: string, periods: string, periodicity: string) =>
    level.trim() && integer(credits) && integer(periods) && periodicity.trim()
      ? JSON.stringify([formation(level), integer(credits), integer(periods), fold(periodicity)]) : '';
  const details = new Map<string, Set<string>>();
  for (const r of data.activeDetails ?? []) {
    const id = detailKey(r[0], r[1], r[2], r[3]), values = details.get(id) ?? new Set<string>();
    values.add(signature(r[4],r[5],r[6],r[7])); details.set(id,values);
  }
  const key = (institution: string, title: string, level: string, modality: string) => JSON.stringify([institution.trim(), fold(title), fold(level), fold(modality)]);
  for (const row of data.records) {
    // HECAA explicitly publishes some complete alternative titles separated by
    // slashes. Index only those literal alternatives; never invent gender forms.
    const alternatives = row[3].split('/').map(title => title.trim()).filter(Boolean);
    const roots = alternatives.map(title => fold(title).split(' ')[0].replace(/[OAE]$/, ''));
    const completeAlternatives = roots.every(root => root.length >= 4) && new Set(roots).size === 1;
    const titles = new Set([row[3], ...(completeAlternatives ? alternatives : [])]);
    for (const title of titles) {
      const contextKey = key(row[1], title, row[4], row[5]);
      const values = contexts.get(contextKey) ?? [];
      if (!values.includes(row)) values.push(row);
      contexts.set(contextKey, values);
    }
  }
  return (context: PublishedContext) => {
    if (![context.institutionCode, context.awardedTitle, context.academicLevel, context.modality].every(value => value.trim() && !['NA', 'N/A'].includes(fold(value)))) return null;
    let candidates = contexts.get(key(context.institutionCode, context.awardedTitle, context.academicLevel, context.modality)) ?? [];
    if (fold(context.status ?? '') === 'ACTIVO' && data.activeRecords) candidates = candidates.filter(row => active.has(JSON.stringify(row)));
    if (context.municipality.trim()) {
      const local = candidates.filter(row => cityKey(row[6]) === cityKey(context.municipality));
      // Identical names can have different SNIES codes (and prices) by campus.
      if (local.length || new Set(candidates.map(row => row[2])).size > 1 || data.activeRecords && fold(context.status ?? '') === 'ACTIVO') candidates = local;
    }
    // Additional official fields can disambiguate active codes, but never
    // substitute a title, city or modality, or select a code because it has a price.
    if (new Set(candidates.map(row => row[0])).size > 1 && fold(context.status ?? '') === 'ACTIVO'
      && context.municipality.trim() && context.educationLevel?.trim() && context.periodicity?.trim()
      && integer(context.credits ?? '') && integer(context.periodCount ?? '') && data.activeDetails) {
      const expected = signature(context.educationLevel,context.credits!,context.periodCount!,context.periodicity);
      // Incomplete or contradictory official metadata cannot be used to eliminate
      // a competing candidate, since that would create false uniqueness.
      const values = candidates.map(r => details.get(detailKey(r[0],r[1],r[5],r[6])));
      if (values.every(rows => rows?.size === 1 && !rows.has(''))) {
        const matched = candidates.filter((_,i) => values[i]!.has(expected));
        if (new Set(matched.map(r => r[0])).size === 1) candidates = matched;
      }
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

// Only a bounded set of official names is sent to the browser, not the catalog.
export function suggestProgramNames(query: string, filters: { academicLevel?: string; institutionCode?: string } = {}): string[] {
  const term = fold(query);
  if (term.length < 2) return [];
  const words = careerWords(term);
  if (!words.length) return [];
  const names = new Map<string, string>();
  for (const record of index.records) {
    if (filters.academicLevel && fold(record[4]) !== fold(filters.academicLevel)
      || filters.institutionCode && record[1] !== filters.institutionCode) continue;
    const name = record[2].trim(), normalized = fold(name);
    if ((literalCareerMatch(term, normalized, knownCareerWords, true) || fuzzyCareerMatch(words, normalized, knownCareerWords, commonCareerWords)) && !names.has(normalized)) names.set(normalized, name);
  }
  const rank = (name: string) => fold(name) === term ? 0 : fold(name).startsWith(term) && literalCareerMatch(term,name,knownCareerWords,true) ? 1 : literalCareerMatch(term,name,knownCareerWords,true) ? 2 : 3;
  return [...names.values()].sort((a,b) => rank(a) - rank(b) || a.length - b.length || a.localeCompare(b, 'es')).slice(0, 8);
}
