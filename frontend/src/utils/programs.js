import { offerIsSelected } from './program-search.js';
const textFields = ['offerId','code','sniesCode','nameMatchMethod','name','rawName','awardedTitle','institutionName','municipality','department','academicLevel','educationLevel','knowledgeArea','broadKnowledgeArea','credits','modality','periodCount','periodicity','status','institutionCode','nameOrigin','searchMatch','institutionSector','institutionWebsite','institutionMunicipality','institutionDepartment','institutionCampus','nameSource','nameSourceField','nameImportedAt'];
export function academicProgramName(program) {
  if (program.provenance === 'demo') return program.name;
  return program.nameOrigin !== 'SNIES_NAME' || program.reviewRequired ? 'Nombre del programa no disponible' : typeof program.name === 'string' && program.name.trim() || 'Nombre del programa no disponible';
}
export function normalizeProgram(row) {
  if (!row || typeof row.sourceId !== 'string' || !row.sourceId.startsWith('upr9-nkiz:') || !row.sourceId.slice(10).trim()) throw new Error('Registro sin identidad de fuente');
  const text = Object.fromEntries(textFields.map(key => [key, typeof row[key] === 'string' ? row[key] : '']));
  if (![text.name,text.rawName,text.awardedTitle,text.institutionName,text.knowledgeArea].some(value => value.trim())) throw new Error('Registro sin información utilizable');
  const incomplete = ['code','name','institutionName','municipality','academicLevel','modality'].some(key => !text[key].trim()) || textFields.some(key => row[key] === null || row[key] !== undefined && typeof row[key] !== 'string');
  return { ...text, ...(Array.isArray(row.groupedSourceIds) && row.groupedSourceIds.every(id => typeof id === 'string' && id.startsWith('upr9-nkiz:')) ? { groupedSourceIds: row.groupedSourceIds } : {}), sourceId: row.sourceId, id: row.sourceId, name: academicProgramName(row), institution: text.institutionName || 'Institución no disponible', city: text.municipality || text.institutionMunicipality || 'No disponible', level: text.academicLevel || 'No disponible', area: text.knowledgeArea, duration: [text.periodCount, text.periodicity].filter(Boolean).join(' ') || '', reviewRequired: row.reviewRequired === true, institutionEnrichmentUnavailable: row.institutionEnrichmentUnavailable === true, recordQuality: incomplete ? 'incomplete' : 'usable', provenance: 'real' };
}
export function normalizeProgramPage(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('Respuesta de programas no válida');
  const programs = []; let unusableCount = 0;
  for (const row of payload.data) {
    try { programs.push(normalizeProgram(row)); } catch { unusableCount++; }
  }
  if (payload.data.length && !programs.length) throw Object.assign(new Error(`Respuesta de programas no válida: ninguno de los ${payload.data.length} registros recibidos tiene identidad e información utilizables.`), { receivedCount: payload.data.length });
  if (payload.total !== undefined && (!Number.isInteger(payload.total) || payload.total < 0)
    || payload.hasMore !== undefined && typeof payload.hasMore !== 'boolean') throw new Error('Conteo de programas no válido');
  if (payload.facets !== undefined && (!payload.facets || typeof payload.facets !== 'object'
    || !['academicLevel','modality','knowledgeArea','institutionCode','department','municipality'].every(key =>
      Array.isArray(payload.facets[key]) && payload.facets[key].every(item => item && typeof item.value === 'string' && Number.isInteger(item.count) && item.count >= 0)))) throw new Error('Cantidades de filtros no válidas');
  if (payload.facets !== undefined && !['educationLevel','institutionSector'].every(key => payload.facets[key] === undefined || Array.isArray(payload.facets[key]) && payload.facets[key].every(item => item && typeof item.value === 'string' && Number.isInteger(item.count) && item.count >= 0))) throw new Error('Cantidades de filtros no válidas');
  const alternatives = Array.isArray(payload.alternatives) ? payload.alternatives.filter(item => item && Array.isArray(item.remove)
    && item.remove.every(key => ['municipality','department','modality','institutionCode','knowledgeArea','academicLevel','educationLevel','institutionSector'].includes(key)) && Number.isInteger(item.count) && item.count > 0) : [];
  return { total: payload.total, hasMore: payload.hasMore, facets: payload.facets, alternatives, programs, receivedCount: payload.data.length, unusableCount, incompleteCount: programs.filter(p => p.recordQuality === 'incomplete').length };
}
export function withOfficialProgram(program, link) {
  if (link?.sourceId !== program.sourceId || link.status !== 'VERIFIED' || !link.url || !link.officialName?.trim()) return program;
  return { ...program, catalogName: program.catalogName || program.name, catalogNameOrigin: program.catalogNameOrigin || program.nameOrigin, name: link.officialName.trim(), nameOrigin: 'OFFICIAL_PAGE', officialUrl: link.url, officialCheckedAt: link.checkedAt };
}
const comparable = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const careerWords = text => [...new Set(comparable(text).replace(/ingeniero\(a\)/g, 'ingenieria')
  .replace(/\bingenier[oa]\b/g, 'ingenieria').split(/[^a-z0-9]+/)
  .filter(word => word && !['de','del','la','las','el','los','y','en','a','al','para'].includes(word)))];
const relatedCareerNames = (query, candidate) => {
  const left = careerWords(query), right = careerWords(candidate);
  return left.length > 0 && right.length > 0 && (left.every(word => right.includes(word)) || right.every(word => left.includes(word)));
};
export function programSearchMatches(program, query) {
  if (!query?.trim()) return [];
  const term = comparable(query.trim());
  const variants = /\bingenieria\b/.test(term)
    ? [term, ...['ingeniero','ingeniera','ingeniero(a)'].map(word => term.replace(/\bingenieria\b/g, word))] : [term];
  return [...(['SNIES_NAME','OFFICIAL_PAGE'].includes(program.nameOrigin) ? [['name','Nombre del programa']] : []),['rawName',program.reviewRequired ? 'Nombre publicado (sin verificar)' : 'Nombre publicado'],['awardedTitle','Título otorgado'],['area','Área publicada']]
    .filter(([key]) => typeof program[key] === 'string' && ((key === 'area' ? [term] : variants).some(value => comparable(program[key]).includes(value)) || key !== 'area' && relatedCareerNames(term, program[key])))
    .map(([key,label]) => ({ key, label, value: program[key] }));
}
export function programHref(program) {
  return program.provenance === 'demo' ? `/programas/${encodeURIComponent(program.id)}` : program.code?.trim() ? `/programas/${encodeURIComponent(program.code)}?registro=${encodeURIComponent(program.sourceId)}` : null;
}
export function programItem(program) {
  return { id: `program-${program.id}`, type: 'program', name: program.name, href: programHref(program) || '/programas', snapshot: Object.fromEntries(['sourceId','code','institutionCode','name','nameOrigin','awardedTitle','institution','city','level','duration','modality','status','provenance'].filter(key => typeof program[key] === 'string').map(key => [key,program[key]])) };
}
export function mergePrograms(current, incoming) {
  const map = new Map(current.map(p => [p.id, p])); incoming.forEach(p => map.set(p.id, p)); return [...map.values()];
}
export function addComparison(current, program) {
  return current.some(p => offerIsSelected(p, program)) || current.length >= 3 ? current : [...current, comparisonSnapshot(program)];
}
export function comparisonSnapshot(program) {
  return Object.fromEntries(['id','sourceId','offerId','groupedSourceIds','code','name','nameOrigin','awardedTitle','institution','city','level','educationLevel','department','area','credits','periodCount','periodicity','institutionWebsite','institutionSector','institutionCampus','sniesCode','duration','modality','status','provenance'].filter(key => program[key] !== undefined).map(key => [key,program[key]]));
}
export function validStoredProgram(program) {
  return program && ['id','name'].every(key => typeof program[key] === 'string')
    && ['sourceId','offerId','code','nameOrigin','awardedTitle','institution','city','level','educationLevel','department','area','credits','periodCount','periodicity','institutionWebsite','institutionSector','institutionCampus','sniesCode','duration','modality','status'].every(key => program[key] === undefined || typeof program[key] === 'string')
    && (program.groupedSourceIds === undefined || Array.isArray(program.groupedSourceIds) && program.groupedSourceIds.every(id => typeof id === 'string' && id.startsWith('upr9-nkiz:')))
    && (program.provenance === 'demo' || program.provenance === 'real' && program.id === program.sourceId && typeof program.code === 'string' && typeof program.sourceId === 'string' && program.sourceId.startsWith('upr9-nkiz:'));
}
