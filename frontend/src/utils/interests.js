export const areas = ['Tecnología', 'Salud', 'Ciencias', 'Artes', 'Negocios', 'Ciencias sociales', 'Educación'];
export const motivations = ['Resolver problemas', 'Ayudar a otros', 'Crear cosas nuevas', 'Liderar equipos', 'Investigar', 'Trabajar con personas'];
export function validInterests(value) { return value && Array.isArray(value.areas) && Array.isArray(value.motivations) && value.areas.every(v => areas.includes(v)) && value.motivations.every(v => motivations.includes(v)); }
export function interestProgress(value) { return validInterests(value) ? (Number(value.areas.length > 0) + Number(value.motivations.length > 0)) * 50 : 0; }
