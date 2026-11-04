export type FinancingType = 'Beca' | 'Beca parcial' | 'Crédito' | 'Crédito condonable' | 'Crédito-beca' | 'Gratuidad' | 'Auxilio';
/** ISO civil date or timestamp with explicit offset; null means not published. */
export type PublishedDate = string | null;
export interface ScholarshipRecommendationRules {
  studentStages?: ('entry' | 'enrolled')[];
  admissionRequired?: boolean;
  preselectionRequired?: boolean;
  nationalities?: ('Colombianos' | 'Extranjeros')[];
  residenceCities?: string[];
  residenceDepartments?: string[];
  institutionIds?: string[];
  academicAreas?: string[];
  support?: ('tuition' | 'living' | 'mobility')[];
  international?: boolean;
  manualRequirementIndexes?: number[];
}
export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  type: FinancingType;
  levels: string[];
  city: string;
  region: string;
  location: string;
  cycle: string;
  description: string;
  coverage: string;
  requirements: string[];
  opensAt: PublishedDate;
  deadline: PublishedDate;
  deadlineNote: string;
  acceptingApplications: boolean;
  applicationStage: 'general' | 'preselection';
  schedule: 'call' | 'institutional';
  verification: 'verified' | 'partial' | 'unavailable';
  verificationNote: string;
  verifiedAt: string;
  eligibility: 'Colombianos' | 'Extranjeros' | 'Según programa';
  residency: string | null;
  modality: string | null;
  audience: string[];
  tags: string[];
  repayment: string;
  repaymentRequired?: boolean;
  restrictions?: string;
  documents?: string[];
  officialUrl: string;
  applicationUrl: string | null;
  termsUrl: string | null;
  recommendationRules?: ScholarshipRecommendationRules;
}
