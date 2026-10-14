const SOURCE = 'https://hecaa.mineducacion.gov.co/consultaspublicas/programas';
export function normalizeTuition(value) {
  if (value?.basis === 'INSTITUTION_PUBLISHED') {
    if (!Number.isSafeInteger(value.amount) || value.amount < 0 || value.currency !== 'COP'
      || value.sourceField !== (value.billingPeriod === 'FREE_TRAINING' ? 'OFFICIAL_FREE_TRAINING_POLICY' : 'OFFICIAL_TUITION_SCHEDULE') || typeof value.source !== 'string'
      || !/^https:\/\/[^/]+\.edu\.co\//.test(value.source)
      || !/^\d{4}-\d{2}-\d{2}$/.test(value.importedAt)
      || !Number.isInteger(value.priceYear) || value.priceYear !== new Date().getUTCFullYear()
      || !['SEMESTER', 'FIRST_ENROLLMENT', 'ACADEMIC_PERIOD', 'FREE_TRAINING'].includes(value.billingPeriod)
      || value.billingPeriod === 'FREE_TRAINING' && (value.amount !== 0 || value.source !== 'https://ape.sena.edu.co/Paginas/PreguntasFrecuentesUsuarios.aspx')
      || typeof value.note !== 'string' || !value.note.trim()) return undefined;
    return { amount:value.amount, currency:'COP', basis:value.basis, source:value.source,
      sourceField:value.sourceField, importedAt:value.importedAt, priceYear:value.priceYear,
      billingPeriod:value.billingPeriod, note:value.note, sourcePage:value.sourcePage };
  }
  if (!value || !Number.isFinite(value.amount) || value.amount < 0 || value.currency !== 'COP'
    || value.basis !== 'NEW_STUDENT_REPORTED' || value.source !== SOURCE
    || value.sourceField !== 'COSTO_MATRÍCULA_ESTUD_NUEVOS'
    || !/^\d{4}-\d{2}-\d{2}$/.test(value.importedAt)) return undefined;
  return { amount: value.amount, currency: 'COP', basis: value.basis, source: SOURCE,
    sourceField: value.sourceField, importedAt: value.importedAt, priceYear: null };
}
export function tuitionChartRows(programs) {
  const rows = programs.map(program => ({ program, tuition: program.provenance === 'real' && program.comparisonState === 'current' ? normalizeTuition(program.tuition) : undefined }));
  const maximum = Math.max(0, ...rows.map(row => row.tuition?.amount ?? 0));
  return rows.map(row => ({ ...row, width: maximum > 0 && row.tuition ? row.tuition.amount / maximum * 100 : 0 }));
}
