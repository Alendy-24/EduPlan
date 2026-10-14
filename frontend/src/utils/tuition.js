const SOURCE = 'https://hecaa.mineducacion.gov.co/consultaspublicas/programas';
export function normalizeTuition(value) {
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
