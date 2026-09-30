import { SOURCES } from '../config/sources.js';
import { fetchJson } from '../utils/http.js';
import type { Program, ProgramFilters } from '../models/program.js';

const fold = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').trim().toUpperCase();
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

export function selectPrograms(programs: Program[], filters: ProgramFilters): Program[] {
  const term = fold(filters.name ?? '');
  // Search variants only: never transform displayed academic names or awarded titles.
  const terms = /\bINGENIERIA\b/.test(term) ? [term, ...['INGENIERO', 'INGENIERA', 'INGENIERO(A)'].map(word => term.replace(/\bINGENIERIA\b/g, word))] : [term];
  const contains = (text: string, filter?: string) => !filter?.trim() || fold(text).includes(fold(filter));
  const exact = (text: string, filter?: string) => !filter?.trim() || fold(text) === fold(filter);
  const matches = programs.flatMap(program => {
    if (!contains(program.municipality, filters.municipality) || !contains(program.modality, filters.modality)
      || !exact(program.academicLevel, filters.academicLevel) || !exact(program.knowledgeArea, filters.knowledgeArea)
      || filters.institutionCode?.trim() && program.institutionCode !== filters.institutionCode.trim()) return [];
    const name = program.nameOrigin === 'SNIES_NAME' ? fold(program.name) : '', title = fold(program.awardedTitle);
    const rank = !term ? 0 : [name, title].includes(term) ? 0
      : terms.some(value => [name, title].includes(value)) ? 1
      : terms.some(value => [name, title].some(text => text.startsWith(value))) ? 2
      : terms.some(value => [name, title].some(text => text.includes(value))) ? 3
      : fold(program.knowledgeArea).includes(term) ? 4 : 5;
    return rank === 5 ? [] : [{ program, rank }];
  });
  const alphabetical = filters.order === 'asc' || filters.order === 'desc';
  matches.sort((a, b) => (alphabetical ? collator.compare(a.program.name, b.program.name) * (filters.order === 'desc' ? -1 : 1) : a.rank - b.rank)
    || a.program.sourceId.localeCompare(b.program.sourceId));
  const offset = (filters.page - 1) * filters.limit;
  return matches.slice(offset, offset + filters.limit).map(({ program, rank }) => ({ ...program, ...(term ? { searchMatch: rank === 0 ? 'EXACT_NAME_OR_TITLE' as const : rank === 4 ? 'KNOWLEDGE_AREA' as const : 'SIMILAR_NAME_OR_TITLE' as const } : {}) }));
}
