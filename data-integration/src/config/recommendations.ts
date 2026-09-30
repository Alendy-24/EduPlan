/** Editorial mapping to literal NBC labels observed in upr9-nkiz on 2026-09-30.
 * This is exploration affinity, not a validated vocational assessment.
 * Motivations and broad areas are deliberately not scored in v1.
 */
export const RECOMMENDATION_CONFIG = {
  version: 'nbc-v1', maxResults: 50,
  weights: { interests: 50, modality: 20, location: 20 },
  taxonomy: {
    'Tecnología': ['Ingeniería de sistemas telemática y afines', 'Ingeniería electrónica telecomunicaciones y afines', 'Ingeniería eléctrica y afines', 'Ingeniería mecánica y afines', 'Ingeniería industrial y afines', 'Ingeniería biomédica y afines'],
    'Salud': ['Medicina', 'Enfermería', 'Odontología', 'Nutrición y dietética', 'Terapias', 'Salud pública', 'Bacteriología', 'Instrumentación quirúrgica', 'Optometría otros programas de ciencias de la salud'],
    'Ciencias': ['Biología microbiología y afines', 'Química y afines', 'Física', 'Matemáticas estadística y afines', 'Geología otros programas de ciencias naturales', 'Agronomía', 'Medicina veterinaria', 'Zootecnia'],
    'Artes': ['Diseño', 'Música', 'Artes plásticas visuales y afines', 'Artes representativas', 'Otros programas asociados a bellas artes', 'Arquitectura'],
    'Negocios': ['Administración', 'Economía', 'Contaduría pública', 'Ingeniería administrativa y afines', 'Publicidad y afines'],
    'Ciencias sociales': ['Psicología', 'Derecho y afines', 'Sociología trabajo social y afines', 'Antropología y artes liberales', 'Ciencia política relaciones internacionales', 'Comunicación social periodismo y afines', 'Geografía historia', 'Filosofía teología y afines', 'Lenguas modernas literatura linguística y afines', 'Bibliotecología otros de ciencias sociales y humanas'],
    'Educación': ['Educación', 'Deportes educación física y recreación'],
  } as Record<string, string[]>,
};
