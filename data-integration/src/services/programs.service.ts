import { SOURCES } from "../config/sources.js";
import type { Program, ProgramFilters } from "../models/program.js";
import { fetchJson } from "../utils/http.js";

interface ProgramSourceRow {
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

function spanishSearchVariants(value: string): string[] {
  const normalized = value.trim().toUpperCase();
  const variants = new Set([normalized]);
  const accents: Record<string, string> = { A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", N: "Ñ" };

  for (let index = 0; index < normalized.length; index += 1) {
    const replacement = accents[normalized[index]];
    if (replacement) {
      variants.add(`${normalized.slice(0, index)}${replacement}${normalized.slice(index + 1)}`);
    }
  }

  return [...variants];
}

function containsText(field: string, value: string): string {
  return spanishSearchVariants(value)
    .map((variant) => `upper(${field}) like '%${escapeSoql(variant)}%'`)
    .join(" OR ");
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

  if (filters.name?.trim()) {
    conditions.push(
      `(${containsText("nombreprograma", filters.name)} OR ${containsText("nombrenbc", filters.name)} OR ${containsText("nombretituloobtenido", filters.name)})`,
    );
  }
  if (filters.municipality?.trim()) {
    conditions.push(`(${containsText("nombremunicipioprograma", filters.municipality)})`);
  }
  if (filters.modality?.trim()) {
    conditions.push(`(${containsText("nombremetodologia", filters.modality)})`);
  }
  if (filters.institutionCode?.trim()) {
    conditions.push(`codigoinstitucion = ${filters.institutionCode}`);
  }

  url.searchParams.set("$select", SELECT_FIELDS);
  url.searchParams.set("$limit", String(filters.limit));
  url.searchParams.set("$offset", String((filters.page - 1) * filters.limit));
  url.searchParams.set("$order", ":id");
  if (conditions.length > 0) {
    url.searchParams.set("$where", conditions.join(" AND "));
  }

  const rows = await fetchJson<ProgramSourceRow[]>(url);
  return rows.map(transformProgram);
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
