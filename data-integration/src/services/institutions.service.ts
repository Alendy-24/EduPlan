import { SOURCES } from "../config/sources.js";
import type { Institution, InstitutionFilters } from "../models/institution.js";
import { fetchJson } from "../utils/http.js";

interface InstitutionSourceRow {
  c_digo_instituci_n?: string;
  nombre_instituci_n?: string;
  sector?: string;
  car_cter_acad_mico?: string;
  departamento_domicilio?: string;
  municipio_domicilio?: string;
  direcci_n_domicilio?: string;
  tel_fono_domicilio?: string;
  estado?: string;
  p_gina_web?: string;
}

interface ProgramInstitutionRow {
  codigoinstitucion?: string;
  nombremetodologia?: string;
}

const SELECT_FIELDS = [
  "c_digo_instituci_n",
  "nombre_instituci_n",
  "sector",
  "car_cter_acad_mico",
  "departamento_domicilio",
  "municipio_domicilio",
  "direcci_n_domicilio",
  "tel_fono_domicilio",
  "estado",
  "p_gina_web",
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

function transformInstitution(row: InstitutionSourceRow): Institution {
  return {
    code: row.c_digo_instituci_n ?? "",
    name: row.nombre_instituci_n ?? "",
    sector: row.sector ?? "",
    academicCharacter: row.car_cter_acad_mico ?? "",
    department: row.departamento_domicilio ?? "",
    municipality: row.municipio_domicilio ?? "",
    address: row.direcci_n_domicilio ?? "",
    phone: row.tel_fono_domicilio ?? "",
    status: row.estado ?? "",
    website: row.p_gina_web ?? "",
  };
}

function exactText(field: string, value: string): string {
  return `upper(${field}) = '${escapeSoql(value.trim().toUpperCase())}'`;
}

function codesWhere(field: string, codes: string[]): string {
  return `${field} in(${codes.map((code) => `'${code}'`).join(",")})`;
}

async function getMatchingInstitutionCodes(filters: InstitutionFilters): Promise<string[] | null> {
  const program = filters.program?.trim();
  const modality = filters.modality?.trim();
  if (!program && !modality) return null;

  const url = new URL(SOURCES.programs.resourceUrl);
  const conditions: string[] = ["nombreestadoprograma = 'Activo'"];
  if (program) {
    conditions.push(`(${[
      "nombreprograma", "nombrenbc", "nombretituloobtenido",
    ].map((field) => `(${containsText(field, program)})`).join(" OR ")})`);
  }
  if (modality) conditions.push(exactText("nombremetodologia", modality));

  url.searchParams.set("$select", "codigoinstitucion");
  url.searchParams.set("$group", "codigoinstitucion");
  url.searchParams.set("$where", conditions.join(" AND "));
  url.searchParams.set("$limit", "5000");
  const rows = await fetchJson<ProgramInstitutionRow[]>(url);
  if (rows.length === 5000) throw new Error("Demasiadas instituciones para filtrar con seguridad");
  return rows.map((row) => row.codigoinstitucion ?? "").filter((code) => /^\d+$/.test(code));
}

async function getModalitiesByInstitution(codes: string[]): Promise<Map<string, string[]>> {
  const modalities = new Map<string, string[]>();
  const validCodes = codes.filter((code) => /^\d+$/.test(code));
  if (validCodes.length === 0) return modalities;

  const url = new URL(SOURCES.programs.resourceUrl);
  url.searchParams.set("$select", "codigoinstitucion,nombremetodologia");
  url.searchParams.set("$where", `${codesWhere("codigoinstitucion", validCodes)} AND nombreestadoprograma = 'Activo' AND nombremetodologia is not null`);
  url.searchParams.set("$group", "codigoinstitucion,nombremetodologia");
  url.searchParams.set("$limit", "5000");
  const rows = await fetchJson<ProgramInstitutionRow[]>(url);
  if (rows.length === 5000) throw new Error("Demasiadas modalidades para mostrar con seguridad");
  for (const row of rows) {
    if (!row.codigoinstitucion || !row.nombremetodologia?.trim()) continue;
    const current = modalities.get(row.codigoinstitucion) ?? [];
    current.push(row.nombremetodologia.trim());
    modalities.set(row.codigoinstitucion, current);
  }
  return modalities;
}

export async function getInstitutions(filters: InstitutionFilters): Promise<Institution[]> {
  const url = new URL(SOURCES.institutions.resourceUrl);
  const conditions: string[] = [];
  const programInstitutionCodes = await getMatchingInstitutionCodes(filters);
  if (programInstitutionCodes?.length === 0) return [];

  if (filters.name?.trim()) {
    conditions.push(`(${containsText("nombre_instituci_n", filters.name)})`);
  }
  if (filters.municipality?.trim()) {
    conditions.push(`(${containsText("municipio_domicilio", filters.municipality)})`);
  }
  if (filters.sector?.trim()) conditions.push(exactText("sector", filters.sector));
  if (filters.academicCharacter?.trim()) {
    conditions.push(exactText("car_cter_acad_mico", filters.academicCharacter));
  }
  if (programInstitutionCodes) {
    conditions.push(codesWhere("c_digo_instituci_n", programInstitutionCodes));
  }

  url.searchParams.set("$select", SELECT_FIELDS);
  url.searchParams.set("$limit", String(filters.limit));
  url.searchParams.set("$offset", String((filters.page - 1) * filters.limit));
  url.searchParams.set("$order", "c_digo_instituci_n,:id");
  if (conditions.length > 0) {
    url.searchParams.set("$where", conditions.join(" AND "));
  }

  const rows = await fetchJson<InstitutionSourceRow[]>(url);
  const institutions = rows.map(transformInstitution);
  if (!filters.includeModalities) return institutions;
  const modalities = await getModalitiesByInstitution(institutions.map((institution) => institution.code));
  return institutions.map((institution) => ({
    ...institution,
    modalities: modalities.get(institution.code) ?? [],
  }));
}

export async function getInstitutionByCode(code: string): Promise<Institution | null> {
  const url = new URL(SOURCES.institutions.resourceUrl);
  url.searchParams.set("$select", SELECT_FIELDS);
  url.searchParams.set("$where", `c_digo_instituci_n = ${code}`);
  url.searchParams.set("$limit", "1");

  const rows = await fetchJson<InstitutionSourceRow[]>(url);
  return rows[0] ? transformInstitution(rows[0]) : null;
}
