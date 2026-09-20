export interface Program {
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
  page: number;
  limit: number;
}
