import { readFileSync } from 'node:fs';
import type { Program } from '../models/program.js';
import { municipalityKey } from '../utils/municipality-key.js';

export interface InstitutionalPrice {
  sniesCode: string; institutionCode: string; modality: string; municipality: string;
  amount: number; source: string; checkedAt: string; priceYear: number;
  billingPeriod: 'SEMESTER' | 'FIRST_ENROLLMENT' | 'ACADEMIC_PERIOD' | 'FREE_TRAINING'; note: string; sourcePage?: number;
}
export interface InstitutionalPriceIndex { schemaVersion: number; records: InstitutionalPrice[] }
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const key = (p: Pick<InstitutionalPrice, 'sniesCode' | 'institutionCode' | 'modality' | 'municipality'>) =>
  JSON.stringify([p.sniesCode, p.institutionCode, fold(p.modality), municipalityKey(p.municipality)]);

export function createInstitutionTuitionResolver(index: InstitutionalPriceIndex) {
  if (index.schemaVersion !== 1) throw new Error('Catálogo de tarifas institucionales inválido');
  const records = new Map<string, InstitutionalPrice[]>();
  for (const record of index.records) {
    if (!/^https:\/\/[^/]+\.edu\.co\//.test(record.source) || !Number.isSafeInteger(record.amount)
      || record.amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(record.checkedAt)
      || !Number.isInteger(record.priceYear) || !['SEMESTER', 'FIRST_ENROLLMENT', 'ACADEMIC_PERIOD', 'FREE_TRAINING'].includes(record.billingPeriod)
      || record.billingPeriod === 'FREE_TRAINING' && (record.amount !== 0 || record.institutionCode !== '9110' || record.source !== 'https://ape.sena.edu.co/Paginas/PreguntasFrecuentesUsuarios.aspx')
      || ![record.sniesCode, record.institutionCode, record.modality, record.municipality, record.note].every(s => typeof s === 'string' && s.trim())) {
      throw new Error('Tarifa institucional sin contexto, monto o fuente válida');
    }
    const id = key(record), values = records.get(id) ?? [];
    values.push(record); records.set(id, values);
  }
  return (program: Pick<Program, 'sniesCode' | 'institutionCode' | 'modality' | 'municipality'>, year = new Date().getUTCFullYear()): Program['tuition'] => {
    if (!program.sniesCode) return undefined;
    const matches = (records.get(key({...program, sniesCode: program.sniesCode})) ?? []).filter(r => r.priceYear === year);
    // Conflicting records must be reviewed instead of selecting a price arbitrarily.
    if (matches.length !== 1) return undefined;
    const r = matches[0];
    return { amount:r.amount, currency:'COP', basis:'INSTITUTION_PUBLISHED', source:r.source,
      sourceField:r.billingPeriod === 'FREE_TRAINING' ? 'OFFICIAL_FREE_TRAINING_POLICY' : 'OFFICIAL_TUITION_SCHEDULE', importedAt:r.checkedAt, priceYear:r.priceYear,
      billingPeriod:r.billingPeriod, note:r.note, sourcePage:r.sourcePage };
  };
}
const index = JSON.parse(readFileSync(new URL('../../data/institution-tuition.json', import.meta.url), 'utf8'));
export const resolveInstitutionTuition = createInstitutionTuitionResolver(index);

// A universal institutional policy applies independently of academic identity.
// Never derive it from a sample price: require the collector's explicit policy
// evidence, independent annual confirmation and the original document digest.
interface TrainingPolicyEvidence extends InstitutionalPrice {
  collector?: string; confirmationSource?: string; evidence?: string; contentSha256?: string;
}
export function createTrainingPolicyResolver(data: InstitutionalPriceIndex) {
  createInstitutionTuitionResolver(data);
  const policies = (data.records as TrainingPolicyEvidence[]).filter(r =>
    r.institutionCode === '9110' && r.billingPeriod === 'FREE_TRAINING' && r.amount === 0
    && r.collector === 'SENA_FREE_TRAINING_V1'
    && r.source === 'https://ape.sena.edu.co/Paginas/PreguntasFrecuentesUsuarios.aspx'
    && r.confirmationSource === 'https://historico.sena.edu.co/es-co/Noticias/Paginas/noticia.aspx?IdNoticia=9485'
    && r.evidence === 'Todos los servicios del SENA son públicos gratuitos; registro, inscripción y acceso a la formación completamente gratuitos.'
    && /^[a-f0-9]{64}$/.test(r.contentSha256 ?? ''));
  return (context: {institutionCode: string; status: string}, year = new Date().getUTCFullYear()): Program['tuition'] => {
    if (context.institutionCode !== '9110' || fold(context.status) !== 'ACTIVO') return undefined;
    const matches = policies.filter(r => r.priceYear === year);
    if (!matches.length || new Set(matches.map(r => r.contentSha256)).size !== 1) return undefined;
    const r = matches[0];
    return {amount:0, currency:'COP', basis:'INSTITUTION_PUBLISHED', source:r.source,
      sourceField:'OFFICIAL_FREE_TRAINING_POLICY', importedAt:r.checkedAt, priceYear:r.priceYear,
      billingPeriod:'FREE_TRAINING', note:r.note};
  };
}
export const resolveTrainingPolicy = createTrainingPolicyResolver(index);
