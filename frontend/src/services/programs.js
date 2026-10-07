import { normalizeProgramPage } from '../utils/programs.js';
// Programs use the same-origin proxy; institutions keep their existing configurable URL.
const baseUrl = '';
export const PROGRAM_PAGE_SIZE = 12;
async function requestPayload(path, signal) {
  let response;
  try { response = await fetch(`${baseUrl}${path}`, { signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('No se pudo conectar al catálogo de programas. Revisa la conexión e inténtalo de nuevo.'); }
  if (!response.ok) throw new Error(response.status === 404 ? 'Programa no encontrado.' : 'No pudimos consultar el catálogo de programas. Inténtalo de nuevo.');
  const payload = await response.json().catch(() => { throw new Error('Respuesta de programas no válida'); });
  return payload;
}
export function getPrograms(filters, page, signal) {
  const query = new URLSearchParams({ page: String(page), limit: String(PROGRAM_PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) value.filter(item=>typeof item === 'string' && item.trim()).forEach(item=>query.append(key,item.trim()));
    else if (value?.trim()) query.set(key, value.trim());
  }
  return requestPayload(`/api/programs?${query}`, signal).then(normalizeProgramPage);
}
export function getProgramsByCode(code, signal) {
  if (typeof code !== 'string' || !code.trim()) return Promise.reject(new Error('Este registro no tiene un código publicado para consultar su detalle.'));
  return requestPayload(`/api/programs/${encodeURIComponent(code)}`, signal).then(normalizeProgramPage);
}

export async function getProgramFilterOptions(signal) {
  const payload = await requestPayload('/api/programs/filters', signal), data = payload?.data;
  if (!data || !['academicLevels','knowledgeAreas','modalities'].every(key => Array.isArray(data[key]) && data[key].every(value => typeof value === 'string' && value.trim())) || !Array.isArray(data.institutions) || !data.institutions.every(item => item && typeof item.code === 'string' && /^\d+$/.test(item.code) && typeof item.name === 'string' && item.name.trim())) throw new Error('Los filtros del catálogo no son válidos. Inténtalo de nuevo.');
  if (!['educationLevels','institutionSectors'].every(key => data[key] === undefined || Array.isArray(data[key]) && data[key].every(value => typeof value === 'string' && value.trim()))) throw new Error('Los filtros del catálogo no son válidos. Inténtalo de nuevo.');
  return { ...data, educationLevels:data.educationLevels || [], institutionSectors:data.institutionSectors || [] };
}

export async function getProgramSuggestions(query, filters, signal) {
  const params = new URLSearchParams({ q: query });
  for (const [key, value] of Object.entries(filters)) if (value?.trim()) params.set(key, value.trim());
  const payload = await requestPayload(`/api/programs/suggestions?${params}`, signal);
  if (!Array.isArray(payload?.data) || !payload.data.every(name => typeof name === 'string' && name.trim())) throw new Error('Sugerencias no válidas');
  return payload.data;
}
