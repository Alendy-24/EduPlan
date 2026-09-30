export interface Program {
  searchMatch?: "EXACT_NAME_OR_TITLE" | "SIMILAR_NAME_OR_TITLE" | "KNOWLEDGE_AREA";
  sourceId: string;
  rawName: string;
  awardedTitle: string;
  knowledgeArea: string;
  nameOrigin: "SOURCE_NAME" | "AWARDED_TITLE" | "UNAVAILABLE";
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
  institutions: { code: string; name: string }[];
}
