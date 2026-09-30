export function normalizeProgram(row) {
  if (!row || typeof row.sourceId !== 'string' || !row.sourceId.startsWith('upr9-nkiz:') || !/^\d+$/.test(row.code)) throw new Error('Respuesta de programas no válida');
  for (const key of ['name','institutionName','municipality','academicLevel','educationLevel','knowledgeArea','modality','periodCount','periodicity','status','institutionCode','nameOrigin']) {
    if (row[key] !== undefined && typeof row[key] !== 'string') throw new Error('Respuesta de programas no válida');
  }
  return { ...row, id: row.sourceId, name: row.name || 'Programa pendiente de verificación', institution: row.institutionName || 'Institución no disponible', city: row.municipality || 'No disponible', level: row.academicLevel || 'No disponible', area: row.knowledgeArea || '', duration: [row.periodCount, row.periodicity].filter(Boolean).join(' ') || 'No disponible', provenance: 'real' };
}
export function programHref(program) {
  return program.provenance === 'demo' ? `/programas/${encodeURIComponent(program.id)}` : `/programas/${encodeURIComponent(program.code)}?registro=${encodeURIComponent(program.sourceId)}`;
}
export function programItem(program) {
  return { id: `program-${program.id}`, type: 'program', name: program.name, href: programHref(program) };
}
export function mergePrograms(current, incoming) {
  const map = new Map(current.map(p => [p.id, p])); incoming.forEach(p => map.set(p.id, p)); return [...map.values()];
}
export function addComparison(current, program) {
  return current.some(p => p.id === program.id) || current.length >= 3 ? current : [...current, comparisonSnapshot(program)];
}
export function comparisonSnapshot(program) {
  return Object.fromEntries(['id','sourceId','code','name','institution','city','level','duration','modality','status','provenance'].filter(key => program[key] !== undefined).map(key => [key,program[key]]));
}
export function validStoredProgram(program) {
  return program && ['id','name'].every(key => typeof program[key] === 'string')
    && ['sourceId','code','institution','city','level','duration','modality','status'].every(key => program[key] === undefined || typeof program[key] === 'string')
    && (program.provenance === 'demo' || program.provenance === 'real' && program.id === program.sourceId && /^\d+$/.test(program.code) && program.sourceId.startsWith('upr9-nkiz:'));
}
