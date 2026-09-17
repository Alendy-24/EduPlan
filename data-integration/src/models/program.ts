export interface Program {
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
