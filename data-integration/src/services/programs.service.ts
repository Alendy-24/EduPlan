import { SOURCES } from "../config/sources.js";
import type { Program, ProgramFilters, ProgramFilterOptions } from "../models/program.js";
import { fetchJson } from "../utils/http.js";

interface ProgramSourceRow {
  search_rank?: string;
  source_row_id?: string;
  nombretituloobtenido?: string;
  nombrenbc?: string;
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

function searchText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toUpperCase();
}

function containsText(field: string, value: string): string {
  return `upper(unaccent(${field})) like '%${escapeSoql(searchText(value))}%'`;
}

function usableNameExpression(): string {
  const raw = "upper(unaccent(nombreprograma))";
  return `case(coalesce(${raw}, '') in ('', 'NA', 'N/A') OR ${raw} = upper(unaccent(nombredepartprograma)) OR ${raw} = upper(unaccent(nombremunicipioprograma)), coalesce(upper(unaccent(nombretituloobtenido)), ''), true, ${raw})`;
}

function programSearch(value: string): { condition: string; rank: string } {
  const term = searchText(value);
  // These are search variants only; the published name and title stay intact.
  const variants = /\bINGENIERIA\b/.test(term)
    ? [term, ...["INGENIERO", "INGENIERA", "INGENIERO(A)"].map(word => term.replace(/\bINGENIERIA\b/g, word))]
    : [term];
  // A city/department mistakenly published as a name must not rank as a program name.
  const raw = "upper(unaccent(nombreprograma))";
  const name = `case(coalesce(${raw}, '') in ('', 'NA', 'N/A') OR ${raw} = upper(unaccent(nombredepartprograma)) OR ${raw} = upper(unaccent(nombremunicipioprograma)), '', true, ${raw})`;
  const title = "upper(unaccent(nombretituloobtenido))";
  const matches = (terms: string[], pattern: "exact" | "prefix" | "contains") =>
    [name, title].flatMap(field => terms.map(text => pattern === "exact"
      ? `${field} = '${escapeSoql(text)}'`
      : `${field} like '${pattern === "contains" ? "%" : ""}${escapeSoql(text)}%'`)).join(" OR ");
  const exact = matches([term], "exact");
  const equivalent = matches(variants, "exact");
  const prefix = matches(variants, "prefix");
  const partial = matches(variants, "contains");
  const area = containsText("nombrenbc", term);
  return {
    condition: `(${partial} OR ${area})`,
    // Socrata sorts this expression before applying limit/offset. :id breaks ties.
    rank: `case(${exact}, 0, ${equivalent}, 1, ${prefix}, 2, ${partial}, 3, true, 4)`,
  };
}

export function transformProgram(row: ProgramSourceRow): Program {
  if (!row.source_row_id?.trim()) {
    throw new Error("La fuente no devolvió el identificador de fila");
  }
  const rawName = row.nombreprograma?.trim() ?? "";
  const awardedTitle = row.nombretituloobtenido?.trim() ?? "";
  const comparable = (value?: string) => (value ?? "").normalize("NFKD")
    .replace(/\p{M}/gu, "").trim().toUpperCase();
  const missing = (value: string) => ["", "NA", "N/A"].includes(comparable(value));
  const suspicious = missing(rawName)
    || [row.nombredepartprograma, row.nombremunicipioprograma]
      .some(value => comparable(value) === comparable(rawName));
  const nameOrigin = !suspicious ? "SOURCE_NAME"
    : !missing(awardedTitle) ? "AWARDED_TITLE" : "UNAVAILABLE";
  return {
    sourceId: `upr9-nkiz:${row.source_row_id.trim()}`,
    rawName,
    awardedTitle,
    knowledgeArea: row.nombrenbc ?? "",
    nameOrigin,
    reviewRequired: suspicious,
    code: row.codigoprograma ?? "",
    institutionCode: row.codigoinstitucion ?? "",
    institutionName: row.nombreinstitucion ?? "",
    name: nameOrigin === "SOURCE_NAME" ? rawName
      : nameOrigin === "AWARDED_TITLE" ? awardedTitle : "Programa pendiente de verificación",
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

export async function getPrograms(filters: ProgramFilters): Promise<Program[]> {
  const url = new URL(SOURCES.programs.resourceUrl);
  const conditions: string[] = [];
  const search = filters.name?.trim() ? programSearch(filters.name) : undefined;

  if (search) conditions.push(search.condition);
  if (filters.municipality?.trim()) {
    conditions.push(`(${containsText("nombremunicipioprograma", filters.municipality)})`);
  }
  if (filters.modality?.trim()) {
    conditions.push(`(${containsText("nombremetodologia", filters.modality)})`);
  }
  if (filters.institutionCode?.trim()) {
    conditions.push(`codigoinstitucion = ${filters.institutionCode}`);
  }
  if (filters.academicLevel?.trim()) {
    conditions.push(`upper(unaccent(nombrenivelacademico)) = '${escapeSoql(searchText(filters.academicLevel))}'`);
  }
  if (filters.knowledgeArea?.trim()) {
    conditions.push(`upper(unaccent(nombrenbc)) = '${escapeSoql(searchText(filters.knowledgeArea))}'`);
  }

  const alphabetical = filters.order === "asc" || filters.order === "desc";
  url.searchParams.set("$select", [SELECT_FIELDS, ...(search ? [`${search.rank} as search_rank`] : []), ...(alphabetical ? [`${usableNameExpression()} as sort_name`] : [])].join(","));
  url.searchParams.set("$limit", String(filters.limit));
  url.searchParams.set("$offset", String((filters.page - 1) * filters.limit));
  url.searchParams.set("$order", alphabetical ? `sort_name ${filters.order === "desc" ? "DESC" : "ASC"},:id` : search ? "search_rank,:id" : ":id");
  if (conditions.length > 0) {
    url.searchParams.set("$where", conditions.join(" AND "));
  }

  const rows = await fetchJson<ProgramSourceRow[]>(url);
  return rows.map(row => ({ ...transformProgram(row), ...(search ? {
    searchMatch: row.search_rank === "0" ? "EXACT_NAME_OR_TITLE" as const
      : row.search_rank === "4" ? "KNOWLEDGE_AREA" as const : "SIMILAR_NAME_OR_TITLE" as const,
  } : {}) }));
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
    const [academicLevels, knowledgeAreas, modalities, institutionRows] = await Promise.all([
      groupedValues("nombrenivelacademico"), groupedValues("nombrenbc"), groupedValues("nombremetodologia"),
      fetchJson<{ code?: string; name?: string }[]>(institutionUrl),
    ]);
    if (!Array.isArray(institutionRows)) throw new Error("Opciones de institución no válidas");
    const byCode = new Map<string, { code: string; name: string }>();
    for (const row of institutionRows) {
      const code = String(row.code ?? "").trim(), name = typeof row.name === "string" ? row.name.trim() : "";
      if (/^\d+$/.test(code) && name && !byCode.has(code)) byCode.set(code, { code, name });
    }
    const data = { academicLevels, knowledgeAreas, modalities, institutions: [...byCode.values()] };
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
  return rows.map(transformProgram);
}
