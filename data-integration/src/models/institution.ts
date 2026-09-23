export interface Institution {
  code: string;
  name: string;
  sector: string;
  academicCharacter: string;
  department: string;
  municipality: string;
  address: string;
  phone: string;
  status: string;
  website: string;
  modalities?: string[];
}

export interface InstitutionFilters {
  name?: string;
  municipality?: string;
  modality?: string;
  program?: string;
  sector?: string;
  academicCharacter?: string;
  includeModalities?: boolean;
  page: number;
  limit: number;
}
