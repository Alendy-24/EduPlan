import type { Program } from '../models/program.js';
import { RECOMMENDATION_CONFIG as config } from '../config/recommendations.js';

export interface Preferences { academicLevel: string; modality: string; municipality: string; department: string; mobility: string }
export interface RecommendationProfile { preferences: Preferences; areas: string[] }
export const normalizeAcademicText = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const usable = (value?: string) => Boolean(value?.trim() && !['na', 'n a', 'sin clasificar', 'no disponible'].includes(normalizeAcademicText(value)));
// Treat published Bogotá / Bogotá, D.C. as the same municipality, not as different preferences.
const locationKey = (value: string) => normalizeAcademicText(value).replace(/^bogota(?: d c)?$/, 'bogota');
// Normalize the editorial taxonomy once, not for every label of every candidate.
const interestNames = new Map(Object.keys(config.taxonomy).map(key => [normalizeAcademicText(key), key]));
const interestNbcs = new Map(Object.entries(config.taxonomy).map(([area, labels]) => [area, new Set(labels.map(normalizeAcademicText))]));
const canonicalInterest = (value: string) => interestNames.get(normalizeAcademicText(value));
export function matchingInterests(program: Program, areas: string[]) {
  const nbc = normalizeAcademicText(program.knowledgeArea || '');
  return [...new Set(areas.map(canonicalInterest).filter((area): area is string => Boolean(area)))].filter(area => interestNbcs.get(area)?.has(nbc));
}
export function isProgramEligibleForRecommendation(program: Program) {
  return normalizeAcademicText(program.status || '') === 'activo' && /^\d+$/.test(program.institutionCode)
    && usable(program.institutionName) && usable(program.name) && program.nameOrigin === 'SNIES_NAME' && !program.reviewRequired
    && usable(program.academicLevel) && usable(program.knowledgeArea) && Boolean(program.code?.trim()) && /^upr9-nkiz:[\w.~-]+$/.test(program.sourceId);
}
export function hasSufficientProfile(profile: RecommendationProfile) {
  return ['Pregrado','Posgrado'].includes(profile.preferences.academicLevel) && profile.areas.some(area => canonicalInterest(area))
    && !(profile.preferences.mobility === 'CITY' && !profile.preferences.municipality.trim())
    && !(profile.preferences.mobility === 'DEPARTMENT' && !profile.preferences.department.trim());
}
export function satisfiesRestrictions(program: Program, profile: RecommendationProfile) {
  const p = profile.preferences;
  return isProgramEligibleForRecommendation(program)
    && (!p.academicLevel || normalizeAcademicText(program.academicLevel) === normalizeAcademicText(p.academicLevel))
    && (p.mobility !== 'CITY' || locationKey(program.municipality) === locationKey(p.municipality))
    && (p.mobility !== 'DEPARTMENT' || locationKey(program.department) === locationKey(p.department));
}
export function scoreProgram(program: Program, profile: RecommendationProfile) {
  if (!hasSufficientProfile(profile) || !satisfiesRestrictions(program, profile)) return null;
  const p = profile.preferences, areas = matchingInterests(program, profile.areas);
  const reasons: string[] = [], matchedCriteria: string[] = ['academicLevel'], unmatchedCriteria: string[] = [], missingInformation: string[] = [];
  let earned = 0, possible = config.weights.interests;
  if (areas.length) { earned += config.weights.interests; matchedCriteria.push('interests'); reasons.push(`Relacionado con tu interés en ${areas.join(' y ')}`); }
  else if (!usable(program.knowledgeArea)) missingInformation.push('NBC no disponible');
  else unmatchedCriteria.push('interests');
  if (p.modality) {
    possible += config.weights.modality;
    if (normalizeAcademicText(program.modality || '') === normalizeAcademicText(p.modality)) { earned += config.weights.modality; matchedCriteria.push('modality'); reasons.push(`Disponible en ${program.modality}, la modalidad que prefieres`); }
    else if (!usable(program.modality)) missingInformation.push('Modalidad no disponible');
    else unmatchedCriteria.push('modality');
  }
  if (['CITY','DEPARTMENT'].includes(p.mobility)) {
    possible += config.weights.location; earned += config.weights.location; matchedCriteria.push('location');
    reasons.push(`Se ofrece en ${p.mobility === 'CITY' ? program.municipality : program.department}, dentro de tu ubicación elegida`);
  }
  if (!usable(program.municipality)) missingInformation.push('Ciudad de la oferta no disponible');
  if (!usable(program.periodCount) || !usable(program.periodicity)) missingInformation.push('Duración incompleta');
  if (!program.sniesCode) missingInformation.push('Código SNIES no resuelto de forma única');
  reasons.push(`Coincide con el nivel ${program.academicLevel} que buscas`);
  return { program, score: Math.round(100 * earned / possible), reasons, matchedCriteria, unmatchedCriteria, missingInformation,
    provenance: { dataset: 'upr9-nkiz', nameSource: program.nameSource, nameImportedAt: program.nameImportedAt, algorithmVersion: config.version } };
}
export function recommendPrograms(programs: Program[], profile: RecommendationProfile, limit = 20, excluded: string[] = []) {
  if (!hasSufficientProfile(profile)) return { data: [], status: 'INCOMPLETE_PROFILE', eligibleCount: 0, algorithmVersion: config.version };
  const ignored = new Set(excluded), seen = new Set<string>();
  const data = programs.flatMap(program => {
    if (seen.has(program.sourceId) || ignored.has(program.sourceId)) return [];
    seen.add(program.sourceId); const result = scoreProgram(program, profile); return result ? [result] : [];
  }).sort((a,b) => b.score - a.score || (a.program.sourceId < b.program.sourceId ? -1 : a.program.sourceId > b.program.sourceId ? 1 : 0));
  return { data: data.slice(0,Math.max(1,Math.min(config.maxResults,limit))), status: data.length ? 'OK' : 'NO_RESULTS', eligibleCount: data.length, algorithmVersion: config.version };
}
export function catalogQuality(programs: Program[]) {
  const count = (test: (p: Program) => boolean) => { const n = programs.filter(test).length; return { count: n, percent: programs.length ? Math.round(n / programs.length * 10000) / 100 : 0 }; };
  return { total: programs.length, resolvedNames: count(p => p.nameOrigin === 'SNIES_NAME' && !p.reviewRequired), reviewRequired: count(p => p.reviewRequired),
    active: count(p => normalizeAcademicText(p.status) === 'activo'), inactive: count(p => normalizeAcademicText(p.status) === 'inactivo'),
    unavailableNames: count(p => p.nameOrigin === 'UNAVAILABLE'), nbc: count(p => usable(p.knowledgeArea)), level: count(p => usable(p.academicLevel)),
    modality: count(p => usable(p.modality)), location: count(p => usable(p.municipality)), sniesCode: count(p => usable(p.sniesCode)),
    duplicateSourceIds: programs.length - new Set(programs.map(p => p.sourceId)).size,
    duplicateContexts: programs.length - new Set(programs.map(p => JSON.stringify([p.institutionCode,p.name,p.awardedTitle,p.academicLevel,p.modality,p.municipality,p.status]))).size,
    eligible: count(isProgramEligibleForRecommendation) };
}
