import { scholarshipStatus, uniqueScholarships, hasRepayment, matchesScholarshipLevel, scholarshipDeadlineTime } from './scholarships.js';
import { emptyFinancingPreferences } from '../utils/financing.js';
import { formationOptions } from '../utils/matching.js';

export const scholarshipMatchLabels = {
  match: 'Coincide con tus preferencias', possible: 'Podría interesarte',
  confirm: 'Requiere confirmar requisitos', incompatible: 'No coincide con un requisito',
};
const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
const same = (a, b) => normalize(a) === normalize(b);
const place = value => normalize(value).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/^bogota(?: d c)?$/, 'bogota');
const samePlace = (a, b) => place(a) === place(b);
const supportNames = { tuition: 'matrícula', living: 'sostenimiento', mobility: 'movilidad' };

function checkRequirements(item, financing, rules, result) {
  const nationalities = rules.nationalities || (['Colombianos', 'Extranjeros'].includes(item.eligibility) ? [item.eligibility] : []);
  if (nationalities.length) {
    if (!financing.nationality) result.pending.push(`La convocatoria está dirigida a ${nationalities.join(' o ').toLowerCase()}; no has indicado nacionalidad.`);
    else if (!nationalities.includes(financing.nationality)) result.incompatibilities.push(`La convocatoria está dirigida a ${nationalities.join(' o ').toLowerCase()}, distinto de tu respuesta de nacionalidad.`);
    else result.matches.push({ criterion: 'nationality', text: `Tu respuesta de nacionalidad coincide con el público publicado: ${financing.nationality.toLowerCase()}.` });
  }
  if (rules.studentStages?.length) {
    const audience = rules.studentStages.map(stage => stage === 'entry' ? 'personas que van a ingresar' : 'estudiantes matriculados').join(' o ');
    if (!financing.studentStage) result.pending.push(`Está dirigida a ${audience}; falta conocer tu etapa.`);
    else if (!rules.studentStages.includes(financing.studentStage)) result.incompatibilities.push(`Exige ser parte de ${audience}; tu etapa declarada es diferente.`);
    else result.matches.push({ criterion: 'stage', text: `La oportunidad contempla tu etapa: ${financing.studentStage === 'entry' ? 'ingreso al programa que buscas financiar' : 'estudiante matriculado en el programa'}.` });
  }
  if (rules.admissionRequired) {
    if (financing.admission === 'no') result.incompatibilities.push('La fuente exige admisión previa y respondiste que aún no tienes admisión.');
    else result.pending.push(financing.admission === 'yes' ? 'Confirma que tu admisión corresponda a una institución y programa habilitados por esta convocatoria.' : 'La fuente exige admisión previa; no has indicado si la tienes.');
  }
  if (rules.preselectionRequired || item.applicationStage === 'preselection') result.pending.push('Solo personas preseleccionadas pueden completar esta etapa; el perfil no acredita preselección.');
  if (rules.residenceCities?.length || rules.residenceDepartments?.length) result.pending.push(`Debes acreditar residencia en ${[...(rules.residenceCities || []), ...(rules.residenceDepartments || [])].join(' o ')}. Tu lugar preferido de estudio no acredita residencia.`);
  if (rules.institutionIds?.length && !rules.admissionRequired) result.pending.push('Confirma tu vínculo con la institución exigida. El perfil no acredita matrícula o admisión en esa institución.');
  for (const index of rules.manualRequirementIndexes || []) {
    const requirement = item.requirements[index];
    if (requirement) result.pending.push(`El perfil no acredita este requisito: ${requirement}`);
  }
}

function academicMatches(item, profile, result) {
  const p = profile.preferences || {};
  if (p.academicLevel) {
    if (matchesScholarshipLevel(item, p.academicLevel)) result.matches.push({ criterion: 'level', text: `Buscas ${p.academicLevel.toLowerCase()} y la oportunidad contempla ${item.levels.join(', ').toLowerCase()}.` });
    else result.preferenceConflicts.push(`Buscas ${p.academicLevel.toLowerCase()}; esta oportunidad publica ${item.levels.join(', ').toLowerCase()}.`);
  }
  if (p.educationLevel) {
    const formation = formationOptions(p.academicLevel).find(value => value.id === p.educationLevel)?.label;
    const aliases = { TECHNICAL: 'Técnica profesional', TECHNOLOGICAL: 'Tecnológica', UNIVERSITY: 'Universitario', MASTER: 'Maestría', SPECIALIZATION: 'Especialización', DOCTORATE: 'Doctorado' };
    if (formation && item.levels.some(level => same(level, aliases[p.educationLevel]))) result.matches.push({ criterion: 'formation', text: `Incluye la formación que elegiste: ${formation.toLowerCase()}.` });
    else if (formation && item.levels.some(level => ['Pregrado', 'Posgrado', 'Todos los niveles'].includes(level))) result.pending.push(`Confirma que ${formation.toLowerCase()} esté incluida; la ficha no permite resolver esa formación con precisión.`);
    else if (formation) result.preferenceConflicts.push(`Buscas formación ${formation.toLowerCase()}; la oportunidad indica ${item.levels.join(', ').toLowerCase()}.`);
  }
  if (p.mobility === 'CITY' && p.municipality) {
    if (samePlace(p.municipality, item.city)) result.matches.push({ criterion: 'location', text: `Quieres estudiar en ${p.municipality} y la oportunidad se ofrece en esa ciudad.` });
    else if (item.city !== 'Colombia') result.preferenceConflicts.push(`Prefieres estudiar solo en ${p.municipality}; la ficha indica ${item.location}.`);
    else result.pending.push(`Confirma la oferta participante en ${p.municipality}; el programa tiene alcance nacional.`);
  }
  if (p.mobility === 'DEPARTMENT' && p.department) {
    // Regions are editorial labels. Match exact published regions only, never infer residence.
    if (samePlace(p.department, item.region)) result.matches.push({ criterion: 'location', text: `La región publicada coincide con tu preferencia de estudio: ${p.department}.` });
    else result.pending.push(`Confirma una oferta habilitada en ${p.department}; el catálogo no permite resolver ese departamento para esta oportunidad.`);
  }
  if (p.modality && item.modality) {
    if (same(p.modality, item.modality)) result.matches.push({ criterion: 'modality', text: `La modalidad publicada es ${item.modality}, la que elegiste.` });
    else result.preferenceConflicts.push(`Prefieres ${p.modality}; la modalidad publicada es ${item.modality}.`);
  }
  const areas = item.recommendationRules?.academicAreas || [];
  if (areas.length) {
    const interests = [...(profile.interests?.areas || []), ...(profile.refinement?.specificNbcs || [])];
    const common = areas.find(area => interests.some(interest => same(area, interest)));
    if (common) result.matches.push({ criterion: 'area', text: `La fuente contempla ${common}, un interés que seleccionaste.` });
    result.pending.push(`Confirma que tu programa pertenezca a las áreas exigidas: ${areas.join(', ')}. Un interés no acredita formación previa.`);
  }
}

function financingMatches(item, financing, rules, result) {
  if (financing.support) {
    if (rules.support?.includes(financing.support)) result.matches.push({ criterion: 'support', text: `Buscas apoyo de ${supportNames[financing.support]} y la fuente publica ese beneficio.` });
    else if (rules.support?.length) result.preferenceConflicts.push(`Buscas ${supportNames[financing.support]}; la cobertura documentada es ${rules.support.map(value => supportNames[value]).join(' y ')}.`);
    else result.pending.push(`Confirma si cubre ${supportNames[financing.support]}; no hay un beneficio estructurado suficiente para compararlo.`);
  }
  if (financing.repayment === 'no') {
    if (hasRepayment(item)) result.preferenceConflicts.push(`Prefieres apoyos sin devolución; esta oportunidad es ${item.type.toLowerCase()} y tiene compromiso financiero.`);
    else result.matches.push({ criterion: 'repayment', text: `Prefieres evitar créditos; la oportunidad está clasificada como ${item.type.toLowerCase()}. Revisa sus obligaciones de permanencia.` });
  }
  if (financing.repayment === 'accepted' && hasRepayment(item)) result.matches.push({ criterion: 'repayment', text: `Aceptas considerar financiación con devolución; esta oportunidad es ${item.type.toLowerCase()}. Comprueba el saldo y las condiciones antes de aceptar.` });
  if (financing.international && typeof rules.international === 'boolean') {
    if (rules.international && financing.international === 'yes') result.matches.push({ criterion: 'international', text: 'Indicaste interés en estudiar en el exterior y esta oportunidad financia una experiencia internacional.' });
    else if (rules.international && financing.international === 'no') result.preferenceConflicts.push('No buscas estudios en el exterior y esta oportunidad es internacional.');
    else if (!rules.international && financing.international === 'no') result.matches.push({ criterion: 'international', text: 'Prefieres estudiar en Colombia y la oportunidad financia estudios en el país.' });
  }
}

/** Rule comparisons are preferences and self-reported facts, never an admission decision. */
export function evaluateScholarship(item, profile = {}, now = new Date()) {
  const financing = { ...emptyFinancingPreferences, ...profile.financing }, rules = item.recommendationRules || {};
  const result = { item, status: scholarshipStatus(item, now), matches: [], pending: [], incompatibilities: [], preferenceConflicts: [] };
  checkRequirements(item, financing, rules, result);
  academicMatches(item, profile, result);
  financingMatches(item, financing, rules, result);
  if (result.status === 'closed') result.pending.unshift('La convocatoria está cerrada; no se recomienda para postular actualmente.');
  if (result.status === 'review') result.pending.unshift('No se ha confirmado una convocatoria general vigente.');
  const criteria = new Set(result.matches.map(match => match.criterion));
  result.classification = result.incompatibilities.length ? 'incompatible' : result.pending.length ? 'confirm' : criteria.size >= 2 && !result.preferenceConflicts.length ? 'match' : criteria.size ? 'possible' : 'confirm';
  result.label = scholarshipMatchLabels[result.classification];
  result.recommendable = ['open', 'upcoming', 'institutional'].includes(result.status) && !result.incompatibilities.length && !result.preferenceConflicts.length;
  const explanationOrder = ['level', 'location', 'support', 'international', 'area', 'modality', 'stage', 'nationality', 'repayment', 'formation'];
  const explanationMatches = [...result.matches].sort((a, b) => explanationOrder.indexOf(a.criterion) - explanationOrder.indexOf(b.criterion));
  result.explanation = explanationMatches.slice(0, 2).map(match => match.text).join(' ') || 'Aún no hay coincidencias suficientes con tu perfil. Esta es una oportunidad disponible para explorar.';
  return result;
}

export function recommendScholarships(items, profile = {}, now = new Date()) {
  const states = { open: 0, upcoming: 1, institutional: 2, review: 3, closed: 4 };
  const rows = uniqueScholarships(items).map(item => evaluateScholarship(item, profile, now));
  const recommendations = rows.filter(row => row.recommendable).sort((a, b) => {
    // No probabilities or synthetic percentage scores: compare actual criteria, then published dates.
    const aMatch = a.classification === 'match' ? 0 : 1, bMatch = b.classification === 'match' ? 0 : 1;
    return aMatch - bMatch || states[a.status] - states[b.status] || b.matches.length - a.matches.length || (scholarshipDeadlineTime(a.item) - scholarshipDeadlineTime(b.item) || 0) || a.item.name.localeCompare(b.item.name, 'es');
  });
  const hasProfile = Boolean(profile.preferences?.academicLevel || profile.interests?.areas?.length || Object.values(profile.financing || {}).some(Boolean));
  return { recommendations, evaluations: rows, incomplete: !hasProfile || !profile.financing?.studentStage || !profile.financing?.support };
}
