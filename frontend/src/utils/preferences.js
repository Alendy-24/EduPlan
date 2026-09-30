export const emptyPreferences = { academicLevel: '', modality: '', municipality: '', department: '', mobility: '' };
export const levels = ['Pregrado', 'Posgrado'];
export const modalities = ['Presencial', 'Presencial-Virtual', 'Virtual', 'A distancia'];
export const mobilities = [['CITY','Solo mi ciudad'],['DEPARTMENT','Mi departamento'],['ANY','Cualquier ciudad'],['RELOCATE','Dispuesto a mudarme']];
export function validPreferences(value) {
  return value && Object.keys(emptyPreferences).every(key => typeof value[key] === 'string' && value[key].length <= 100)
    && ['',...levels].includes(value.academicLevel) && ['',...modalities].includes(value.modality)
    && ['',...mobilities.map(([key])=>key)].includes(value.mobility);
}
export function profileCompleteness(preferences, interests) {
  const sections = [interests.areas.length > 0, interests.motivations.length > 0, levels.includes(preferences.academicLevel),
    modalities.includes(preferences.modality), mobilities.some(([key])=>key === preferences.mobility),
    preferences.mobility === 'CITY' ? Boolean(preferences.municipality.trim()) : preferences.mobility === 'DEPARTMENT' ? Boolean(preferences.department.trim()) : ['ANY','RELOCATE'].includes(preferences.mobility)];
  return Math.round(sections.filter(Boolean).length / sections.length * 100);
}
export function sufficientPreferences(preferences, interests) {
  return levels.includes(preferences.academicLevel) && interests.areas.length > 0
    && !(preferences.mobility === 'CITY' && !preferences.municipality.trim())
    && !(preferences.mobility === 'DEPARTMENT' && !preferences.department.trim());
}
