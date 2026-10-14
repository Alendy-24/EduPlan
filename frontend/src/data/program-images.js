// Fotografías reales descargadas de Pexels. No representan una sede concreta.
// Fuentes y licencia: docs/program-images.md.
const photo = (id, alt, author, slug, pexelsId) => ({
  src: `/images/programs/${id}.jpg`, alt, author, sourceName: 'Pexels',
  sourceUrl: `https://www.pexels.com/photo/${slug}-${pexelsId}/`,
});
export const programImages = {
  bioingenieria: photo('bioingenieria', 'Investigadora utilizando una pipeta en un laboratorio', 'Polina Tankilevitch', 'scientist-in-laboratory', 3735709),
  mecanica: photo('mecanica', 'Engranajes y componentes mecánicos de metal', 'Tim Mossholder', 'close-up-shot-of-metal-gears', 4843915),
  civil: photo('civil', 'Vista aérea de una obra en construcción', '8 K', 'construction-site-along-the-road', 2833686),
  electronica: photo('electronica', 'Microchip y componentes de un circuito electrónico', 'ClickerHappy', 'shallow-focus-photography-of-black-circuit-board', 1448561),
  industrial: photo('industrial', 'Maquinaria de producción dentro de una fábrica', 'Anna Shvets', 'an-industrial-machine-in-a-factory', 5953729),
  tecnologia: photo('tecnologia', 'Persona trabajando en un computador portátil', 'cottonbro studio', 'man-using-a-laptop', 5474282),
  salud: photo('salud', 'Estetoscopio sobre una superficie blanca', 'Pavel Danilyuk', 'stethoscope-on-white-surface', 6753427),
  ciencias: photo('ciencias', 'Investigador utilizando un microscopio en un laboratorio', 'Edward Jenner', 'a-man-using-a-microscope-in-a-laboratory', 4033019),
  artes: photo('artes', 'Pinceles sobre una pintura de colores', 'Steve A Johnson', 'two-paintbrushes-on-multicolored-abstract-painting', 1061779),
  negocios: photo('negocios', 'Profesionales conversando durante una reunión de trabajo', 'Vlada Karpovich', 'business-partners-having-a-meeting-at-the-office', 7433859),
  sociales: photo('sociales', 'Estudiantes conversando en un aula', 'Andy Barbour', 'students-having-conversation-inside-the-classroom', 6683485),
  educacion: photo('educacion', 'Docente acompañando a estudiantes en un aula', 'Max Fischer', 'a-teacher-standing-in-the-classroom', 5212703),
  agro: photo('agro', 'Plantas creciendo dentro de un invernadero', 'Maria Firman', 'sprouts-and-plants-in-greenhouse', 12152936),
  general: photo('general', 'Estudiantes trabajando juntos en una biblioteca', 'Mikhail Nilov', 'photo-of-classmates-studying-in-a-library', 7777676),
};

// Personalización opcional por identidad exacta de catálogo (sourceId).
// Ejemplo: 'upr9-nkiz:ID': { src: '/images/programs/mi-foto.jpg', alt: '...', author: '...', sourceUrl: 'https://...' }
export const programImageOverrides = {};

// Fotos específicas por nombre oficial normalizado. Este registro tiene
// prioridad sobre las familias y se comparte entre todas las instituciones.
export const programCareerImages = {
  bioingenieria: 'bioingenieria',
};

// Reglas visuales editoriales por nombre, no una clasificación académica.
// Se comparan frases completas, ignorando tildes, puntuación y conectores.
// Las especialidades específicas preceden a las familias generales.
export const programImageDisciplines = [
  { image: 'mecanica', phrases: ['ingenieria mecanica', 'ingenieria electromecanica', 'ingenieria mecatronica', 'mecanica automotriz', 'tecnologia mecanica', 'mantenimiento mecanico'] },
  { image: 'civil', phrases: ['ingenieria civil', 'arquitectura', 'urbanismo', 'construccion civil', 'construccion obras', 'ingenieria construccion'] },
  { image: 'electronica', phrases: ['ingenieria electronica', 'ingenieria electrica', 'ingenieria telecomunicaciones', 'electronica', 'electrotecnia', 'automatizacion', 'robotica'] },
  { image: 'industrial', phrases: ['ingenieria industrial', 'produccion industrial', 'ingenieria produccion', 'manufactura', 'procesos industriales', 'logistica'] },
  { image: 'tecnologia', phrases: ['ingenieria sistemas', 'ingenieria software', 'ingenieria informatica', 'ingenieria computacion', 'informatica', 'programacion', 'desarrollo software', 'ciencias computacion', 'ciencia datos', 'sistemas informacion'] },
  { image: 'agro', phrases: ['veterinaria', 'veterinario', 'zootecnia', 'agronomia', 'agropecuaria', 'agricultura', 'agroindustrial', 'ingenieria agricola', 'ingenieria agronomica'] },
  { image: 'educacion', phrases: ['educacion', 'pedagogia', 'didactica', 'docencia', 'licenciatura'] },
  { image: 'salud', phrases: ['medicina', 'enfermeria', 'odontologia', 'epidemiologia', 'salud', 'nutricion', 'fisioterapia', 'terapia', 'optometria', 'instrumentacion quirurgica'] },
  { image: 'artes', phrases: ['artes', 'arte', 'diseno', 'musica', 'cine', 'fotografia', 'danza', 'teatro', 'animacion'] },
  { image: 'negocios', phrases: ['administracion', 'economia', 'contaduria', 'contabilidad', 'finanzas', 'mercadeo', 'marketing', 'negocios', 'comercio', 'gerencia'] },
  { image: 'sociales', phrases: ['psicologia', 'sociologia', 'antropologia', 'derecho', 'comunicacion', 'periodismo', 'filosofia', 'historia', 'literatura', 'linguistica', 'trabajo social', 'ciencias politicas', 'ciencia politica'] },
  { image: 'ciencias', phrases: ['biologia', 'microbiologia', 'bacteriologia', 'quimica', 'fisica', 'geologia', 'matematicas', 'estadistica', 'biotecnologia', 'ciencias naturales'] },
];

// Relaciones editoriales de áreas, independientes de los datos académicos.
export const programImageAreas = {
  tecnologia: ['Tecnología', 'Ingeniería de sistemas telemática y afines'],
  mecanica: ['Ingeniería mecánica y afines'],
  civil: ['Ingeniería civil y afines', 'Arquitectura'],
  electronica: ['Ingeniería electrónica telecomunicaciones y afines', 'Ingeniería eléctrica y afines'],
  industrial: ['Ingeniería industrial y afines'],
  salud: ['Salud', 'Ciencias de la salud', 'Bacteriología', 'Enfermería', 'Instrumentación quirúrgica', 'Medicina', 'Nutrición y dietética', 'Odontología', 'Optometría otros programas de ciencias de la salud', 'Salud pública', 'Terapias'],
  ciencias: ['Ciencias', 'Matemáticas y ciencias naturales', 'Biología microbiología y afines', 'Física', 'Geología otros programas de ciencias naturales', 'Matemáticas estadística y afines', 'Química y afines'],
  artes: ['Artes', 'Bellas artes', 'Artes plásticas visuales y afines', 'Artes representativas', 'Diseño', 'Música', 'Otros programas asociados a bellas artes'],
  negocios: ['Negocios', 'Economía administración contaduría y afines', 'Administración', 'Contaduría pública', 'Economía', 'Ingeniería administrativa y afines', 'Publicidad y afines'],
  sociales: ['Ciencias sociales', 'Ciencias sociales y humanas', 'Antropología y artes liberales', 'Bibliotecología otros de ciencias sociales y humanas', 'Ciencia política relaciones internacionales', 'Comunicación social periodismo y afines', 'Derecho y afines', 'Filosofía teología y afines', 'Geografía historia', 'Lenguas modernas literatura linguística y afines', 'Psicología', 'Sociología trabajo social y afines'],
  educacion: ['Educación', 'Ciencias de la educación', 'Deportes educación física y recreación'],
  agro: ['Agronomía veterinaria y afines', 'Agronomía', 'Medicina veterinaria', 'Zootecnia'],
};
