export interface Program {
  searchMatch?: "EXACT_NAME_OR_TITLE" | "SIMILAR_NAME_OR_TITLE" | "KNOWLEDGE_AREA";
  sourceId: string;
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
  modality?: string;
  institutionCode?: string;
  academicLevel?: string;
  knowledgeArea?: string;
  order?: "source" | "asc" | "desc";
  page: number;
  limit: number;
}

export interface ProgramFilterOptions {
  academicLevels: string[];
  knowledgeAreas: string[];
  modalities: string[];
  institutions: { code: string; name: string; municipality?: string; department?: string; campus?: string }[];
}
