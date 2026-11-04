import { scholarships } from '../data/scholarships.js';

export const scholarshipStates = { open: 'Abierta', upcoming: 'Próxima', institutional: 'Por calendario institucional', review: 'Por verificar', closed: 'Cerrada' };
export const financingTypes = ['Beca', 'Beca parcial', 'Crédito', 'Crédito condonable', 'Crédito-beca', 'Gratuidad', 'Auxilio'];
const priority = { open: 0, upcoming: 1, institutional: 2, review: 3, closed: 4 };
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export function scholarshipToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// A date without a published hour spans the entire Colombian calendar day.
function instant(value, endOfDay = false) {
  if (!value) return NaN;
  const datePart = value.slice(0, 10);
  const civil = new Date(`${datePart}T12:00:00Z`);
  if (!dateOnly.test(datePart) || !Number.isFinite(civil.getTime()) || civil.toISOString().slice(0, 10) !== datePart) return NaN;
  return Date.parse(dateOnly.test(value) ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}-05:00` : value);
}

export function scholarshipStatus(item, now = new Date()) {
  const current = now instanceof Date ? now.getTime() : instant(now);
  const end = instant(item.deadline, true), start = instant(item.opensAt);
  if (Number.isFinite(end) && (dateOnly.test(item.deadline) ? current > end : current >= end)) return 'closed';
  if (item.verification !== 'verified') return 'review';
  if (Number.isFinite(start) && current < start) return 'upcoming';
  if (item.schedule === 'institutional') return 'institutional';
  if (item.applicationStage === 'preselection') return 'review';
  if (item.acceptingApplications === true && Number.isFinite(end)) return 'open';
  return 'review';
}

export function scholarshipStatusLabel(status) { return scholarshipStates[status] || scholarshipStates.review; }

export function scholarshipDeadlineTime(item) {
  const timestamp = instant(item.deadline, true);
  return Number.isFinite(timestamp) ? timestamp : Infinity;
}

export function scholarshipDate(value) {
  const timestamp = instant(value);
  if (!Number.isFinite(timestamp)) return 'Sin fecha general publicada';
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric', ...(!dateOnly.test(value) ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : {}) }).format(new Date(timestamp));
}

function fold(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim(); }
export function hasRepayment(item) { return ['Crédito', 'Crédito condonable', 'Crédito-beca'].includes(item.type) || item.repaymentRequired === true; }

export function matchesScholarshipLevel(item, level) {
  const groups = { Pregrado: ['Pregrado', 'Técnica profesional', 'Tecnológica'], Posgrado: ['Posgrado', 'Especialización', 'Maestría', 'Doctorado'] };
  return item.levels.includes('Todos los niveles') || (groups[level] || [level]).some(value => item.levels.includes(value));
}

function matchesLocation(item, location) {
  // This catalog distinguishes Colombian study locations from international mobility.
  if (location === 'Colombia') return item.city !== 'Exterior' && item.region !== 'Exterior';
  return item.city === location || item.region === location;
}

export function uniqueScholarships(items) {
  const ids = new Set(), editions = new Set();
  return items.filter(item => {
    const edition = fold(`${item.provider}|${item.name}|${item.cycle}`);
    if (ids.has(item.id) || editions.has(edition)) return false;
    ids.add(item.id); editions.add(edition); return true;
  });
}

export function filterScholarships(items, filters = {}, now = new Date()) {
  const terms = fold(filters.query).split(/\s+/).filter(Boolean);
  return uniqueScholarships(items).filter(item => {
    const haystack = fold([item.name, item.provider, item.description, item.location, item.city, item.region, item.residency, item.coverage, item.type, item.eligibility, ...item.levels, ...(item.tags || []), ...item.requirements].join(' '));
    return (!filters.type || item.type === filters.type)
      && (!filters.city || matchesLocation(item, filters.city))
      && (!filters.level || matchesScholarshipLevel(item, filters.level))
      && (!filters.status || scholarshipStatus(item, now) === filters.status)
      && (!filters.opportunity || item.id === filters.opportunity)
      && (!filters.audience || item.tags?.includes(filters.audience))
      && (!filters.eligibility || item.eligibility === filters.eligibility)
      && (!filters.coverage || fold(item.coverage).includes(fold(filters.coverage)))
      && (!filters.repayment || hasRepayment(item) === (filters.repayment === 'yes'))
      && terms.every(term => haystack.includes(term));
  }).sort((a, b) => {
    const name = a.name.localeCompare(b.name, 'es');
    if (filters.order === 'asc' || filters.order === 'desc') return (filters.order === 'desc' ? -1 : 1) * name;
    if (filters.order === 'verified') return b.verifiedAt.localeCompare(a.verifiedAt) || name;
    const ordering = filters.order === 'opening' ? { ...priority, upcoming: 0, open: 1 } : priority;
    const stateDifference = ordering[scholarshipStatus(a, now)] - ordering[scholarshipStatus(b, now)];
    const field = filters.order === 'opening' ? 'opensAt' : 'deadline';
    const dateValue = item => Number.isFinite(instant(item[field], true)) ? instant(item[field], true) : Infinity;
    return stateDifference || (dateValue(a) - dateValue(b) || 0) || name;
  });
}

export function getScholarships(filters = {}, now = new Date()) { return filterScholarships(scholarships, filters, now); }

export function scholarshipItem(item) {
  return { id: `opportunity-${item.id}`, type: 'opportunity', name: item.name,
    href: `/becas?opportunity=${encodeURIComponent(item.id)}`,
    snapshot: { provider: item.provider, type: item.type, level: item.levels.join(', '), city: item.city,
      deadline: item.deadline || '', verifiedAt: item.verifiedAt || '', officialUrl: item.officialUrl } };
}

/** Structural editorial audit; network access is deliberately separate from date validation. */
export function auditScholarships(items, today = scholarshipToday()) {
  const errors = [], warnings = [];
  if (uniqueScholarships(items).length !== items.length) errors.push('Identificadores o ediciones duplicados');
  for (const item of items) {
    const fail = message => errors.push(`${item.id}: ${message}`);
    if (!/^[a-z0-9][a-z0-9-]+$/.test(item.id)) fail('Identificador no estable');
    for (const key of ['name', 'provider', 'description', 'coverage', 'cycle', 'verifiedAt', 'repayment', 'verificationNote']) {
      if (typeof item[key] !== 'string' || !item[key].trim()) fail(`Falta ${key}`);
    }
    if (!['verified', 'partial', 'unavailable'].includes(item.verification) || !['call', 'institutional'].includes(item.schedule) || !['general', 'preselection'].includes(item.applicationStage)) fail('Estado editorial inválido');
    const indexes = item.recommendationRules?.manualRequirementIndexes;
    if (indexes && (!Array.isArray(indexes) || new Set(indexes).size !== indexes.length || indexes.some(index => !Number.isInteger(index) || index < 0 || index >= item.requirements.length))) fail('Referencia de requisito manual inválida');
    for (const key of ['officialUrl', 'termsUrl', 'applicationUrl']) {
      if (!item[key]) continue;
      try { const url = new URL(item[key]); if (url.protocol !== 'https:' || url.username || url.password) fail(`${key} debe usar HTTPS sin credenciales`); }
      catch { fail(`${key} no es una URL válida`); }
    }
    for (const key of ['opensAt', 'deadline', 'verifiedAt']) {
      const value = item[key];
      if (value !== null && (!value || !Number.isFinite(instant(value)) || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))) fail(`${key} debe ser ISO o null`);
    }
    if (!financingTypes.includes(item.type)) fail('Tipo financiero desconocido');
    if (!item.officialUrl || !item.requirements?.length || !item.repayment) fail('Falta fuente, requisitos u obligaciones');
    if (item.opensAt && item.deadline && instant(item.opensAt) > instant(item.deadline, true)) fail('Apertura posterior al cierre');
    if (item.verifiedAt > today) fail('Fecha de consulta futura');
    if (instant(today) - instant(item.verifiedAt) > 90 * 86400000 || item.verification !== 'verified') warnings.push(`${item.id}: requiere revisión editorial`);
  }
  return { errors, warnings };
}
