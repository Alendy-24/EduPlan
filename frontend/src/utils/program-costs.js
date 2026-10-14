import { websiteUrl } from './website.js';
const sources = {
  'unad.edu.co': 'https://estudios.unad.edu.co/costos',
  'unilibre.edu.co': 'https://www.unilibre.edu.co/derechos-pecuniarios/',
  'javeriana.edu.co': 'https://www.javeriana.edu.co/informacion/acuerdo-valores-de-matricula-y-otros-derechos-pecunarios',
};
const fold = value => (value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
export function officialCostSource(program) {
  if (program.provenance !== 'real') return null;
  const url = websiteUrl(program.institutionWebsite);
  if (!url) return null;
  const hostname = new URL(url).hostname.toLowerCase();
  const domain = Object.keys(sources).find(domain => hostname === domain || hostname.endsWith('.' + domain));
  return { url: domain ? sources[domain] : url, dedicated: Boolean(domain), domain };
}
// Official Colombian tuition schedules, checked 2026-10-07. Never infer semester
// tuition from total curriculum credits or apply foreign-campus rates.
export function publishedAdditionalCosts(program) {
  const source = officialCostSource(program);
  if (source?.domain !== 'unad.edu.co' || program.comparisonState !== 'current') return null;
  const level = fold(program.educationLevel);
  const rates = {
    tecnologica: [152000, 245000, 167000], tecnologico: [152000, 245000, 167000],
    universitario: [170000, 245000, 187000], universitaria: [170000, 245000, 187000],
    'especializacion universitaria': [598000, 390000],
    maestria: [925000, 390000], doctorado: [1032000, 390000],
  };
  const rate = rates[level];
  if (!rate) return null;
  return { source: source.url, year: 2026, checkedAt: '2026-10-07',
    items: [
      { label: 'Crédito académico regular', amount: rate[0] },
      ...(rate[2] ? [{ label: 'Crédito de cursos disciplinares en las escuelas indicadas por UNAD', amount: rate[2], note: 'Aplica a determinados cursos de Salud, Ingeniería y Tecnología, y Ciencias Agrícolas. Consulta qué créditos tienen esta tarifa.' }] : []),
      { label: 'Inscripción', amount: rate[1] },
      { label: 'Seguro estudiantil con la inscripción', amount: 10000 },
      { label: 'Derechos de grado ordinario', amount: 977000 },
    ], note: 'Tarifas para Colombia. La matrícula depende de los créditos inscritos y de su tarifa. El grado se paga al finalizar y no se suma a la matrícula inicial. Confirma descuentos y cobros aplicables.' };
}
