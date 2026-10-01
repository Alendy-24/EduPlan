import {formationOptions} from './matching.js';
export const emptyPreferences = { academicLevel: '', modality: '', municipality: '', department: '', mobility: '', educationLevel: '' };
export const levels = ['Pregrado', 'Posgrado'];
export const modalities = ['Presencial', 'Presencial-Virtual', 'Virtual', 'A distancia'];
export const mobilities = [['CITY','Solo mi ciudad'],['DEPARTMENT','Mi departamento'],['ANY','Cualquier ciudad'],['RELOCATE','Dispuesto a mudarme']];
export function validPreferences(value) {
  return value && Object.keys(emptyPreferences).filter(key=>key!=='educationLevel').every(key => typeof value[key] === 'string' && value[key].length <= 100)
    && (value.educationLevel===undefined||value.educationLevel===''||formationOptions(value.academicLevel).some(f=>f.id===value.educationLevel))
    && ['',...levels].includes(value.academicLevel) && ['',...modalities].includes(value.modality)
    && ['',...mobilities.map(([key])=>key)].includes(value.mobility);
}
export function profileCompleteness(preferences, interests) {
  const sections = [interests.areas.length > 0, interests.motivations.length > 0, levels.includes(preferences.academicLevel),
    modalities.includes(preferences.modality), mobilities.some(([key])=>key === preferences.mobility),
    preferences.mobility === 'CITY' ? Boolean(preferences.municipality.trim()) : preferences.mobility === 'DEPARTMENT' ? Boolean(preferences.department.trim()) : ['ANY','RELOCATE'].includes(preferences.mobility)];
  return Math.round(sections.filter(Boolean).length / sections.length * 100);
}
export function sufficientPreferences(preferences, interests, refinement) {
  return (interests.areas.length > 0 || Boolean(refinement?.specificNbcs.length))
    && !(preferences.mobility === 'CITY' && !preferences.municipality.trim())
    && !(preferences.mobility === 'DEPARTMENT' && !preferences.department.trim());
}
