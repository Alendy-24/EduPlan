import { institutionContactOverrides, institutionContactsReviewedAt } from '../data/institution-contacts.js';

const regions = [
  ['601', ['Bogotá D.C.', 'Bogotá, D.C.', 'Bogotá', 'Cundinamarca']],
  ['602', ['Valle del Cauca', 'Cauca', 'Nariño']],
  ['604', ['Antioquia', 'Córdoba', 'Chocó']],
  ['605', ['Atlántico', 'Bolívar', 'Magdalena', 'Cesar', 'La Guajira', 'Sucre']],
  ['606', ['Risaralda', 'Quindío', 'Caldas']],
  ['607', ['Arauca', 'Santander', 'Norte de Santander']],
  ['608', ['Caquetá', 'Vaupés', 'Guaviare', 'Vichada', 'Putumayo', 'Amazonas', 'Guainía', 'Casanare', 'Meta', 'Boyacá', 'Tolima', 'Huila', 'Archipiélago de San Andrés, Providencia y Santa Catalina', 'San Andrés y Providencia']],
];
const normalizePlace = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
const codesByDepartment = new Map(regions.flatMap(([code, departments]) => departments.map(department => [normalizePlace(department), code])));

// CRC: 60 + indicativo regional + siete dígitos. No completar números truncados.
export function formatColombianPhone(value, department) {
  const raw = String(value ?? '').trim();
  if (!raw || /^(?:n\/?a|no disponible|no informa)$/i.test(raw)) return { status: 'missing', label: 'No disponible', href: null };
  const review = { status: 'review', label: raw, href: null };
  const match = raw.match(/^([+\d\s().-]+?)(?:\s*(?:ext(?:ensi[oó]n)?\.?|x)\s*(\d{1,6}))?$/i);
  if (!match) return review;
  let digits = match[1].replace(/\D/g, '');
  const extension = match[2];
  // Un prefijo internacional explícito no puede reinterpretarse como indicativo antiguo.
  if (/^(?:\+|57[\s(])/.test(raw) && !(digits.length === 12 && digits.startsWith('57'))) return review;
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2);
  if (/^[1245678][2-9]\d{6}$/.test(digits)) digits = `60${digits}`;
  if (/^[2-9]\d{6}$/.test(digits)) {
    const area = codesByDepartment.get(normalizePlace(department));
    if (!area) return review;
    digits = area + digits;
  }
  if (!/^(?:60[1245678][2-9]\d{6}|3\d{9})$/.test(digits)) return review;
  const label = `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return {
    status: 'formatted',
    label: extension ? `${label} ext. ${extension}` : label,
    href: `tel:+57${digits}${extension ? `;ext=${extension}` : ''}`,
  };
}

export function resolveInstitutionPhone(institution) {
  const raw = String(institution?.phone ?? '').trim();
  const override = institutionContactOverrides[String(institution?.code ?? '')];
  const applies = override && raw === override.sourcePhone
    && normalizePlace(institution?.municipality) === normalizePlace(override.municipality);
  const formatted = formatColombianPhone(applies ? override.phone : raw, institution?.department);
  return {
    ...formatted,
    raw,
    sourceUrl: applies ? override.sourceUrl : 'https://www.datos.gov.co/d/n5yy-8nav',
    reviewedAt: applies ? institutionContactsReviewedAt : null,
    verified: Boolean(applies && formatted.href),
  };
}
