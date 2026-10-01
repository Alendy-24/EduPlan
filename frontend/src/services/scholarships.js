import { scholarships } from '../data/scholarships.js';

const statusLabels = {
  open: 'Abierta según la fuente consultada',
  upcoming: 'Próxima convocatoria anunciada',
  closed: 'Convocatoria cerrada',
  review: 'Consultar convocatoria vigente',
};

export function scholarshipToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function scholarshipStatus(item, today = scholarshipToday()) {
  if (item.deadline && item.deadline < today) return 'closed';
  if (item.opensAt && item.opensAt > today) return 'upcoming';
  if (item.deadline && item.acceptingApplications === true) return 'open';
  // Un calendario anunciado no confirma que la plataforma abrió efectivamente.
  return 'review';
}

export function scholarshipStatusLabel(status) {
  return statusLabels[status] || statusLabels.review;
}

export function scholarshipDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Consultar convocatoria vigente';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${value}T12:00:00Z`));
}

function fold(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function filterScholarships(items, filters = {}, today = scholarshipToday()) {
  const terms = fold(filters.query).split(/\s+/).filter(Boolean);
  const statusPriority = { open: 0, upcoming: 1, review: 2, closed: 3 };
  return items.filter(item => {
    const haystack = fold([item.name, item.provider, item.description, item.location, item.coverage, ...item.requirements].join(' '));
    return (!filters.type || item.type === filters.type)
      && (!filters.city || item.city === filters.city || item.region === filters.city)
      && (!filters.level || item.levels.includes(filters.level) || item.levels.includes('Todos los niveles'))
      && (!filters.status || scholarshipStatus(item, today) === filters.status)
      && (!filters.opportunity || item.id === filters.opportunity)
      && terms.every(term => haystack.includes(term));
  }).sort((a, b) => {
    if (filters.order === 'asc' || filters.order === 'desc') {
      return (filters.order === 'desc' ? -1 : 1) * a.name.localeCompare(b.name, 'es');
    }
    const difference = statusPriority[scholarshipStatus(a, today)] - statusPriority[scholarshipStatus(b, today)];
    return difference || (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.name.localeCompare(b.name, 'es');
  });
}

export function getScholarships(filters = {}, today = scholarshipToday()) {
  return filterScholarships(scholarships, filters, today);
}

export function scholarshipItem(item) {
  return {
    id: `opportunity-${item.id}`, type: 'opportunity', name: item.name,
    href: `/becas?opportunity=${encodeURIComponent(item.id)}`,
    snapshot: {
      provider: item.provider, type: item.type, level: item.levels.join(', '), city: item.city,
      deadline: item.deadline, verifiedAt: item.verifiedAt, officialUrl: item.officialUrl,
    },
  };
}
