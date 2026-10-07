import { SOURCES } from "../config/sources.js";
import type { Program, ProgramFilters, ProgramFilterOptions, ProgramSearchPage } from "../models/program.js";
import { fetchJson } from "../utils/http.js";
import { getInstitutionCatalog } from './institutions.service.js';
import { resolveOfficialProgramName } from './snies-names.js';
import { getProgramCatalog, selectPrograms, hasPublishedProgramName, searchProgramOffers, groupProgramOffers } from './program-catalog.js';

interface ProgramSourceRow {
  search_rank?: string;
  source_row_id?: string;
  nombretituloobtenido?: string;
  nombrenbc?: string;
  nombreareaconocimiento?: string;
  cantidadcreditos?: string;
  codigoprograma?: string;
  codigoinstitucion?: string;
  nombreinstitucion?: string;
  nombreprograma?: string;
  nombrenivelacademico?: string;
  nombrenivelformacion?: string;
  nombremetodologia?: string;
  cantidadperiodos?: string;
  nombreperiodicidad?: string;
  nombredepartprograma?: string;
  nombremunicipioprograma?: string;
  nombreestadoprograma?: string;
}

const SELECT_FIELDS = [
  ":id as source_row_id",
  "nombretituloobtenido",
  "nombrenbc",
  "nombreareaconocimiento",
  "cantidadcreditos",
  "codigoprograma",
  "codigoinstitucion",
  "nombreinstitucion",
  "nombreprograma",
  "nombrenivelacademico",
  "nombrenivelformacion",
  "nombremetodologia",
  "cantidadperiodos",
  "nombreperiodicidad",
  "nombredepartprograma",
  "nombremunicipioprograma",
  "nombreestadoprograma",
].join(",");

function escapeSoql(value: string): string {
  return value.replaceAll("'", "''");
}

export function transformProgram(row: ProgramSourceRow): Program {
  if (!row.source_row_id?.trim()) {
    throw new Error("La fuente no devolvió el identificador de fila");
  }
  const rawName = row.nombreprograma?.trim() ?? "";
  const awardedTitle = row.nombretituloobtenido?.trim() ?? "";
  const official = resolveOfficialProgramName({ institutionCode: row.codigoinstitucion ?? '', awardedTitle,
    academicLevel: row.nombrenivelacademico ?? '', modality: row.nombremetodologia ?? '', municipality: row.nombremunicipioprograma ?? '' });
  const nameOrigin = official ? 'SNIES_NAME' : 'UNAVAILABLE';
  return {
    sourceId: `upr9-nkiz:${row.source_row_id.trim()}`,
    rawName,
    awardedTitle,
    knowledgeArea: row.nombrenbc ?? "",
    broadKnowledgeArea: row.nombreareaconocimiento ?? "",
    credits: row.cantidadcreditos ?? "",
    nameOrigin,
    reviewRequired: !official,
    nameSource: official?.source,
    nameSourceField: official?.field,
    nameImportedAt: official?.importedAt,
    sniesCode: official?.sniesCode,
    nameMatchMethod: official ? 'EXACT_OFFICIAL_CONTEXT' : undefined,
    code: row.codigoprograma ?? "",
    institutionCode: row.codigoinstitucion ?? "",
    institutionName: row.nombreinstitucion ?? "",
    name: official?.name ?? "Nombre del programa no disponible",
    academicLevel: row.nombrenivelacademico ?? "",
    educationLevel: row.nombrenivelformacion ?? "",
    modality: row.nombremetodologia ?? "",
    periodCount: row.cantidadperiodos ?? "",
    periodicity: row.nombreperiodicidad ?? "",
    department: row.nombredepartprograma ?? "",
    municipality: row.nombremunicipioprograma ?? "",
    status: row.nombreestadoprograma ?? "",
  };
}

async function enrichInstitutions(programs: Program[]): Promise<Program[]> {
  if (!programs.length) return programs;
  try {
    const catalog = await getInstitutionCatalog();
    return programs.map(program => {
      const institution = catalog.get(program.institutionCode);
      return { ...program, institutionName: institution?.name || program.institutionName, institutionWebsite: institution?.website ?? '', institutionSector: institution?.sector ?? '',
        institutionMunicipality: institution?.municipality ?? '',
        institutionDepartment: institution?.department ?? '',
        institutionCampus: institution?.campus ?? '' };
    });
  } catch {
    // An institution outage must not remove programs or invent a generic URL.
    return programs.map(program => ({ ...program, institutionEnrichmentUnavailable: true }));
  }
}

export async function getPrograms(filters: ProgramFilters): Promise<Program[]> {
  // Resolve names and exclude unavailable records before pagination for every
  // listing, including the default view and searches by knowledge area.
  const catalog = await getProgramCatalog<ProgramSourceRow>(SELECT_FIELDS, transformProgram);
  if (filters.institutionSector) {
    const enriched = await enrichInstitutions(catalog);
    if (enriched.some(program => program.institutionEnrichmentUnavailable)) throw new Error('No fue posible confirmar el tipo de institución');
    return selectPrograms(enriched, filters);
  }
  if (filters.order === 'institution-asc') return selectPrograms(await enrichInstitutions(catalog), filters);
  return enrichInstitutions(selectPrograms(catalog, filters));
}

export async function getProgramSearchPage(filters: ProgramFilters): Promise<ProgramSearchPage> {
  const catalog = await getProgramCatalog<ProgramSourceRow>(SELECT_FIELDS, transformProgram);
  const enriched = await enrichInstitutions(catalog);
  if (filters.institutionSector && enriched.some(program => program.institutionEnrichmentUnavailable)) throw new Error('No fue posible confirmar el tipo de institución');
  return searchProgramOffers(enriched, filters);
}

const FILTER_CACHE_MS = 5 * 60 * 1000;
let filterCache: { expiresAt: number; data: ProgramFilterOptions } | undefined;
let filterRequest: Promise<ProgramFilterOptions> | undefined;

async function groupedValues(field: string): Promise<string[]> {
  const url = new URL(SOURCES.programs.resourceUrl);
  url.searchParams.set("$select", `${field} as value`);
  url.searchParams.set("$group", field);
  url.searchParams.set("$where", `${field} IS NOT NULL`);
  url.searchParams.set("$order", field);
  url.searchParams.set("$limit", "50000");
  const rows = await fetchJson<{ value?: string }[]>(url);
  if (!Array.isArray(rows)) throw new Error("Opciones de catálogo no válidas");
  return [...new Set(rows.map(row => typeof row.value === "string" ? row.value.trim() : "").filter(value => value && !["NA", "N/A"].includes(value.toUpperCase())))];
}

export function getProgramFilterOptions(): Promise<ProgramFilterOptions> {
  if (filterCache && filterCache.expiresAt > Date.now()) return Promise.resolve(filterCache.data);
  if (filterRequest) return filterRequest;
  filterRequest = (async () => {
    const institutionUrl = new URL(SOURCES.programs.resourceUrl);
    institutionUrl.searchParams.set("$select", "codigoinstitucion as code,nombreinstitucion as name");
    institutionUrl.searchParams.set("$group", "codigoinstitucion,nombreinstitucion");
    institutionUrl.searchParams.set("$where", "codigoinstitucion IS NOT NULL AND nombreinstitucion IS NOT NULL");
    institutionUrl.searchParams.set("$order", "nombreinstitucion,codigoinstitucion");
    institutionUrl.searchParams.set("$limit", "50000");
    const [academicLevels, knowledgeAreas, modalities, educationLevels, institutionRows, catalog] = await Promise.all([
      groupedValues("nombrenivelacademico"), groupedValues("nombrenbc"), groupedValues("nombremetodologia"), groupedValues("nombrenivelformacion"),
      fetchJson<{ code?: string; name?: string }[]>(institutionUrl),
      getInstitutionCatalog().catch(() => new Map()),
    ]);
    if (!Array.isArray(institutionRows)) throw new Error("Opciones de institución no válidas");
    const byCode = new Map<string, { code: string; name: string }>();
    for (const row of institutionRows) {
      const code = String(row.code ?? "").trim(), name = typeof row.name === "string" ? row.name.trim() : "";
      const institution = catalog.get(code);
      if (/^\d+$/.test(code) && name && !byCode.has(code)) byCode.set(code, { code, name, ...(institution ? { municipality: institution.municipality, department: institution.department, campus: institution.campus } : {}) });
    }
    const institutionSectors = [...new Set([...catalog.values()].map(institution => institution.sector).filter((value): value is string => Boolean(value?.trim())))].sort();
    const data = { academicLevels, knowledgeAreas, modalities, educationLevels, institutionSectors, institutions: [...byCode.values()] };
    filterCache = { data, expiresAt: Date.now() + FILTER_CACHE_MS };
    return data;
  })().finally(() => { filterRequest = undefined; });
  return filterRequest;
}

export async function getProgramsByCode(code: string): Promise<Program[]> {
  const url = new URL(SOURCES.programs.resourceUrl);
  url.searchParams.set("$select", SELECT_FIELDS);
  url.searchParams.set("$where", `codigoprograma = '${escapeSoql(code)}'`);
  url.searchParams.set("$limit", "50000");
  url.searchParams.set("$order", ":id");

  const rows = await fetchJson<ProgramSourceRow[]>(url);
  const programs = rows.map(transformProgram).filter(hasPublishedProgramName);
  const identities = new Map(groupProgramOffers(programs).flatMap(group => (group.groupedSourceIds ?? [group.sourceId]).map(id => [id, group.offerId] as const)));
  return enrichInstitutions(programs.map(program => ({ ...program, offerId: identities.get(program.sourceId) })));
}

// Shared bounded, five-minute catalog cache: no catalog transfer to the browser.
export async function getRecommendationCatalog(): Promise<Program[]> {
  return enrichInstitutions(await getProgramCatalog<ProgramSourceRow>(SELECT_FIELDS, transformProgram));
}
