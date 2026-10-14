export interface Program {
  searchMatch?: "EXACT_NAME_OR_TITLE" | "SIMILAR_NAME_OR_TITLE" | "KNOWLEDGE_AREA" | "SPELLING_VARIANT";
  sourceId: string;
  groupedSourceIds?: string[];
  offerId?: string;
  rawName: string;
  awardedTitle: string;
  knowledgeArea: string;
  broadKnowledgeArea?: string;
  credits?: string;
  nameOrigin: "SNIES_NAME" | "UNAVAILABLE";
  nameSource?: string;
  nameSourceField?: string;
  nameImportedAt?: string;
  sniesCode?: string;
  nameMatchMethod?: string;
  institutionWebsite?: string;
  institutionSector?: string;
  institutionMunicipality?: string;
  institutionDepartment?: string;
  institutionCampus?: string;
  institutionEnrichmentUnavailable?: boolean;
  reviewRequired: boolean;
  code: string;
  institutionCode: string;
  institutionName: string;
  name: string;
  academicLevel: string;
  educationLevel: string;
  modality: string;
  periodCount: string;
  periodicity: string;
  department: string;
  municipality: string;
  status: string;
}

export interface ProgramFilters {
  name?: string;
  municipality?: string;
  department?: string;
  modality?: string | string[];
  institutionSector?: string;
  educationLevel?: string;
  institutionCode?: string;
  academicLevel?: string;
  knowledgeArea?: string;
  order?: "source" | "asc" | "desc" | "institution-asc";
  page: number;
  limit: number;
}

export interface ProgramFilterOptions {
  academicLevels: string[];
  knowledgeAreas: string[];
  modalities: string[];
  educationLevels: string[];
  institutionSectors: string[];
  institutions: { code: string; name: string; municipality?: string; department?: string; campus?: string }[];
}

export interface ProgramFacet { value: string; count: number }
export type ProgramFacets = Record<'academicLevel' | 'modality' | 'knowledgeArea' | 'institutionCode' | 'department' | 'municipality' | 'educationLevel' | 'institutionSector', ProgramFacet[]>;
export interface ProgramSearchPage {
  data: Program[];
  total: number;
  hasMore: boolean;
  facets: ProgramFacets;
  alternatives: { remove: (keyof ProgramFilters)[]; count: number }[];
}
