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

export async function getInstitutions(filters: InstitutionFilters): Promise<Institution[]> {
  const url = new URL(SOURCES.institutions.resourceUrl);
  const conditions: string[] = [];

  if (filters.name?.trim()) {
    conditions.push(`(${containsText("nombre_instituci_n", filters.name)})`);
  }
  if (filters.municipality?.trim()) {
    conditions.push(`(${containsText("municipio_domicilio", filters.municipality)})`);
  }

  url.searchParams.set("$select", SELECT_FIELDS);
  url.searchParams.set("$limit", String(filters.limit));
  url.searchParams.set("$offset", String((filters.page - 1) * filters.limit));
  url.searchParams.set("$order", "c_digo_instituci_n");
  if (conditions.length > 0) {
    url.searchParams.set("$where", conditions.join(" AND "));
  }

  const rows = await fetchJson<InstitutionSourceRow[]>(url);
  return rows.map(transformInstitution);
}

export async function getInstitutionByCode(code: string): Promise<Institution | null> {
  const url = new URL(SOURCES.institutions.resourceUrl);
  url.searchParams.set("$select", SELECT_FIELDS);
  url.searchParams.set("$where", `c_digo_instituci_n = ${code}`);
  url.searchParams.set("$limit", "1");

  const rows = await fetchJson<InstitutionSourceRow[]>(url);
  return rows[0] ? transformInstitution(rows[0]) : null;
}
