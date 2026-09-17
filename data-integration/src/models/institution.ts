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
}

export interface InstitutionFilters {
  name?: string;
  municipality?: string;
  page: number;
  limit: number;
}
