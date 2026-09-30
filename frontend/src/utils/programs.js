const textFields = ['code','name','rawName','awardedTitle','institutionName','municipality','department','academicLevel','educationLevel','knowledgeArea','modality','periodCount','periodicity','status','institutionCode','nameOrigin'];
export function normalizeProgram(row) {
  if (!row || typeof row.sourceId !== 'string' || !row.sourceId.startsWith('upr9-nkiz:') || !row.sourceId.slice(10).trim()) throw new Error('Registro sin identidad de fuente');
  const text = Object.fromEntries(textFields.map(key => [key, typeof row[key] === 'string' ? row[key] : '']));
  if (![text.name,text.rawName,text.awardedTitle,text.institutionName,text.knowledgeArea].some(value => value.trim())) throw new Error('Registro sin información utilizable');
  const incomplete = ['code','name','institutionName','municipality','academicLevel','modality'].some(key => !text[key].trim()) || textFields.some(key => row[key] === null || row[key] !== undefined && typeof row[key] !== 'string');
  return { ...text, sourceId: row.sourceId, id: row.sourceId, name: text.name || text.awardedTitle || (!row.reviewRequired && text.rawName) || 'Nombre no disponible', institution: text.institutionName || 'Institución no disponible', city: text.municipality || 'No disponible', level: text.academicLevel || 'No disponible', area: text.knowledgeArea, duration: [text.periodCount, text.periodicity].filter(Boolean).join(' ') || 'No disponible', reviewRequired: row.reviewRequired === true, recordQuality: incomplete ? 'incomplete' : 'usable', provenance: 'real' };
}
export function normalizeProgramPage(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('Respuesta de programas no válida');
  const programs = []; let unusableCount = 0;
  for (const row of payload.data) {
    try { programs.push(normalizeProgram(row)); } catch { unusableCount++; }
  }
  if (payload.data.length && !programs.length) throw Object.assign(new Error(`Respuesta de programas no válida: ninguno de los ${payload.data.length} registros recibidos tiene identidad e información utilizables.`), { receivedCount: payload.data.length });
  return { programs, receivedCount: payload.data.length, unusableCount, incompleteCount: programs.filter(p => p.recordQuality === 'incomplete').length };
}
const comparable = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
export function programSearchMatches(program, query) {
  if (!query?.trim()) return [];
  const term = comparable(query.trim());
  return [['rawName',program.reviewRequired ? 'Nombre publicado (sin verificar)' : 'Nombre publicado'],['awardedTitle','Título otorgado'],['area','Área publicada']]
    .filter(([key]) => typeof program[key] === 'string' && comparable(program[key]).includes(term))
    .map(([key,label]) => ({ key, label, value: program[key] }));
}
export function programHref(program) {
  return program.provenance === 'demo' ? `/programas/${encodeURIComponent(program.id)}` : program.code?.trim() ? `/programas/${encodeURIComponent(program.code)}?registro=${encodeURIComponent(program.sourceId)}` : null;
}
export function programItem(program) {
  return { id: `program-${program.id}`, type: 'program', name: program.name, href: programHref(program) || '/programas' };
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
    && (program.provenance === 'demo' || program.provenance === 'real' && program.id === program.sourceId && typeof program.code === 'string' && typeof program.sourceId === 'string' && program.sourceId.startsWith('upr9-nkiz:'));
}
