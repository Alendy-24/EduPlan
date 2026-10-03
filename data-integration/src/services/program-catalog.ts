import { createHash } from 'node:crypto';
import { SOURCES } from '../config/sources.js';
import { fetchJson } from '../utils/http.js';
import { careerWords, fuzzyCareerMatch } from '../utils/career-search.js';
import type { Program, ProgramFilters, ProgramFacets, ProgramSearchPage } from '../models/program.js';

const fold = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').trim().toUpperCase();
const locationKey = (text: string) => {
  const key = fold(text).replace(/[^A-Z0-9]/g, '');
  const aliases: Record<string, string> = { BOGOTADC:'BOGOTA', SANTIAGODECALI:'CALI', CARTAGENADEINDIAS:'CARTAGENA', SANTIAGODETOLU:'TOLU', SANJOSEDECUCUTA:'CUCUTA', ARCHIPIELAGODESANANDRESPROVIDENCIAYSANTACATALINA:'SANANDRESYPROVIDENCIA' };
  return aliases[key] || key;
};
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
let cache: { expiresAt: number; programs: Program[] } | undefined;
let pending: Promise<Program[]> | undefined;
export function clearProgramCatalogCache() { cache = undefined; pending = undefined; }

// The official-name join must precede search, A–Z ordering and pagination.
// This bounded memory cache is shared across searches; there is no database or per-card fetch.
export function getProgramCatalog<T>(fields: string, transform: (row: T) => Program): Promise<Program[]> {
  if (cache && cache.expiresAt > Date.now()) return Promise.resolve(cache.programs);
  if (pending) return pending;
  pending = (async () => {
    const programs: Program[] = [], pageSize = 10000;
    for (let offset = 0; offset < 100000; offset += pageSize) {
      const url = new URL(SOURCES.programs.resourceUrl);
      url.searchParams.set('$select', fields); url.searchParams.set('$order', ':id');
      url.searchParams.set('$limit', String(pageSize)); url.searchParams.set('$offset', String(offset));
      const rows = await fetchJson<T[]>(url, 30000);
      if (!Array.isArray(rows)) throw new Error('Catálogo de programas no válido');
      programs.push(...rows.map(transform));
      if (rows.length < pageSize) {
        if (new Set(programs.map(program => program.sourceId)).size !== programs.length) throw new Error('La fuente cambió durante la consulta; reintenta.');
        cache = { programs, expiresAt: Date.now() + 5 * 60 * 1000 };
        return programs;
      }
    }
    throw new Error('Catálogo de programas incompleto');
  })().finally(() => { pending = undefined; });
  return pending;
}

// Compare meaningful words in either direction so expanded academic names remain
// discoverable. Requiring every word of the shorter name avoids matching two
// unrelated engineering programs merely because they share “ingeniería”.
export function relatedCareerNames(query: string, candidate: string): boolean {
  const left = careerWords(query), right = careerWords(candidate);
  if (!left.length || !right.length) return false;
  return left.every(word => right.includes(word)) || right.every(word => left.includes(word));
}

export function hasPublishedProgramName(program: Program): boolean {
  return program.nameOrigin === 'SNIES_NAME' && !program.reviewRequired
    && Boolean(program.name.trim()) && fold(program.name) !== 'NOMBRE DEL PROGRAMA NO DISPONIBLE';
}


function matchesFilters(program: Program, filters: ProgramFilters): boolean {
  const contains = (text: string, filter?: string) => !filter?.trim() || fold(text).includes(fold(filter));
  const exact = (text: string, filter?: string) => !filter?.trim() || fold(text) === fold(filter);
  return (!filters.department?.trim() || locationKey(program.department) === locationKey(filters.department))
    && (filters.department?.trim() && filters.municipality?.trim()
      ? locationKey(program.municipality) === locationKey(filters.municipality) : contains(program.municipality, filters.municipality))
    && exact(program.modality, filters.modality) && exact(program.academicLevel, filters.academicLevel)
    && exact(program.knowledgeArea, filters.knowledgeArea)
    && (!filters.institutionCode?.trim() || program.institutionCode === filters.institutionCode.trim());
}
function rankedPrograms(programs: Program[], query: string) {
  const term = fold(query), words = careerWords(term);
  const terms = /\bINGENIERIA\b/.test(term) ? [term, ...['INGENIERO', 'INGENIERA', 'INGENIERO(A)'].map(word => term.replace(/\bINGENIERIA\b/g, word))] : [term];
  return programs.filter(hasPublishedProgramName).flatMap(program => {
    const name = fold(program.name), title = fold(program.awardedTitle);
    const fuzzyRank = () => {
      const candidates = [name, title].filter(text => fuzzyCareerMatch(words, text));
      return candidates.length ? 6 + Math.min(0.9, Math.min(...candidates.map(text => Math.max(0, careerWords(text).length - words.length))) / 100) : 7;
    };
    const rank = !term ? 0 : [name, title].includes(term) ? 0
      : terms.some(value => [name, title].includes(value)) ? 1
      : terms.some(value => [name, title].some(text => text.startsWith(value))) ? 2
      : terms.some(value => [name, title].some(text => text.includes(value))) ? 3
      : [name, title].some(text => relatedCareerNames(term, text)) ? 4
      : fold(program.knowledgeArea).includes(term) ? 5
      : fuzzyRank();
    return rank === 7 ? [] : [{ program, rank }];
  });
}
function sortMatches(matches: { program: Program; rank: number }[], filters: ProgramFilters) {
  const alphabetical = filters.order === 'asc' || filters.order === 'desc';
  return matches.sort((a, b) => (filters.order === 'institution-asc'
    ? collator.compare(a.program.institutionName, b.program.institutionName) || collator.compare(a.program.name, b.program.name)
    : alphabetical ? collator.compare(a.program.name, b.program.name) * (filters.order === 'desc' ? -1 : 1) : a.rank - b.rank)
    || a.program.sourceId.localeCompare(b.program.sourceId));
}
function annotatedProgram({ program, rank }: { program: Program; rank: number }, query: string): Program {
  return { ...program, ...(query.trim() ? { searchMatch: rank === 0 ? 'EXACT_NAME_OR_TITLE' : rank === 5 ? 'KNOWLEDGE_AREA' : rank >= 6 ? 'SPELLING_VARIANT' : 'SIMILAR_NAME_OR_TITLE' } : {}) };
}
export function selectPrograms(programs: Program[], filters: ProgramFilters): Program[] {
  const matches = sortMatches(rankedPrograms(programs, filters.name ?? '').filter(({program}) => matchesFilters(program, filters)), filters);
  const offset = (filters.page - 1) * filters.limit;
  return matches.slice(offset, offset + filters.limit).map(match => annotatedProgram(match, filters.name ?? ''));
}

function programOfferKey(program: Program): string {
  return program.sniesCode?.trim() && program.institutionCode.trim() && program.municipality.trim()
      ? JSON.stringify([program.sniesCode, program.institutionCode, fold(program.name), fold(program.awardedTitle),
        locationKey(program.department), locationKey(program.municipality), fold(program.academicLevel), fold(program.educationLevel),
        fold(program.modality), fold(program.status), program.periodCount, fold(program.periodicity), program.credits ?? ''])
      : program.sourceId;
}

export function groupProgramOffers(programs: Program[]): Program[] {
  const groups = new Map<string, Program[]>();
  for (const program of programs.filter(hasPublishedProgramName)) {
    // Only merge rows with an independently resolved SNIES identity and the
    // same published offering. Different campuses, modalities and curricula stay separate.
    const key = programOfferKey(program);
    const group = groups.get(key) ?? []; group.push(program); groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    group.sort((a,b) => a.sourceId.localeCompare(b.sourceId));
    return { ...group[0], offerId: 'offer:' + createHash('sha256').update(programOfferKey(group[0])).digest('hex'), ...(group.length > 1 ? { groupedSourceIds: group.map(program => program.sourceId) } : {}) };
  });
}

export function searchProgramOffers(programs: Program[], filters: ProgramFilters): ProgramSearchPage {
  const ranked = rankedPrograms(groupProgramOffers(programs), filters.name ?? '');
  const matching = ranked.filter(({program}) => matchesFilters(program, filters));
  const facets = {} as ProgramFacets;
  const keys: (keyof ProgramFacets)[] = ['academicLevel','modality','knowledgeArea','institutionCode','department','municipality'];
  for (const key of keys) {
    const relaxed = { ...filters, [key]: '' };
    if (key === 'department') relaxed.municipality = '';
    const counts = new Map<string, { value: string; count: number }>();
    for (const {program} of ranked) {
      if (!matchesFilters(program, relaxed) || !program[key]?.trim()) continue;
      const value = program[key], normalized = ['department','municipality'].includes(key) ? locationKey(value) : fold(value);
      const entry = counts.get(normalized) ?? { value, count: 0 }; entry.count++; counts.set(normalized, entry);
    }
    facets[key] = [...counts.values()].sort((a,b) => collator.compare(a.value,b.value));
  }
  const alternatives: ProgramSearchPage['alternatives'] = [];
  if (!matching.length) {
    for (const key of ['municipality','modality','institutionCode','knowledgeArea','department','academicLevel'] as const) {
      if (!filters[key]?.trim()) continue;
      const remove: (keyof ProgramFilters)[] = key === 'department' ? ['department','municipality'] : [key];
      const relaxed = { ...filters }; remove.forEach(field => { delete relaxed[field]; });
      const count = ranked.filter(({program}) => matchesFilters(program, relaxed)).length;
      if (count) alternatives.push({ remove, count });
    }
  }
  const offset = (filters.page - 1) * filters.limit;
  return {
    data: sortMatches(matching,filters).slice(offset,offset+filters.limit).map(match=>annotatedProgram(match,filters.name ?? '')),
    total: matching.length, hasMore: offset + filters.limit < matching.length, facets, alternatives,
  };
}
