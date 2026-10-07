import { programImages, programImageAreas, programImageOverrides, programImageDisciplines, programCareerImages } from '../data/program-images.js';

const fold = text => typeof text === 'string' ? text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
const byArea = new Map(Object.entries(programImageAreas).flatMap(([key, areas]) => areas.map(area => [fold(area), key])));
const careerName = text => fold(text).split(' ').filter(word => !['de','del','en','la','las','el','los','y'].includes(word)).join(' ');
const disciplines = programImageDisciplines.map(rule => ({ ...rule, phrases: rule.phrases.map(phrase => ` ${careerName(phrase)} `) }));

export function resolveProgramImage(program = {}) {
  if (programImageOverrides[program.sourceId]) return programImageOverrides[program.sourceId];
  // Conserva las imágenes propias de las rutas de demostración.
  if (program.provenance === 'demo' && program.image) return { src: program.image, alt: 'Espacio de estudio de referencia' };
  const publishedName = ['SNIES_NAME','OFFICIAL_PAGE'].includes(program.nameOrigin) && !program.reviewRequired && fold(program.name) !== 'nombre del programa no disponible' ? careerName(program.name) : '';
  if (publishedName) {
    const specific = programCareerImages[fold(program.name)];
    if (specific) return programImages[specific];
    const rule = disciplines.find(rule => rule.phrases.some(phrase => ` ${publishedName} `.includes(phrase)));
    // Same published name means same default photo across institutions. When
    // no rule is reviewed, use a neutral photo rather than a varying NBC.
    return rule ? programImages[rule.image] : programImages.general;
  }
  for (const area of [program.knowledgeArea, program.area, program.broadKnowledgeArea]) {
    const key = byArea.get(fold(area));
    if (key) return programImages[key];
  }
  return programImages.general;
}
