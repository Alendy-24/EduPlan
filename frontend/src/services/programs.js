import { normalizeProgramPage } from '../utils/programs.js';
// Programs use the same-origin proxy; institutions keep their existing configurable URL.
const baseUrl = '';
export const PROGRAM_PAGE_SIZE = 12;
async function request(path, signal) {
  let response;
  try { response = await fetch(`${baseUrl}${path}`, { signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('No se pudo conectar al catálogo de programas. Revisa la conexión e inténtalo de nuevo.'); }
  if (!response.ok) throw new Error(response.status === 404 ? 'Programa no encontrado.' : 'No pudimos consultar el catálogo de programas. Inténtalo de nuevo.');
  const payload = await response.json().catch(() => { throw new Error('Respuesta de programas no válida'); });
  return normalizeProgramPage(payload);
}
export function getPrograms(filters, page, signal) {
  const query = new URLSearchParams({ page: String(page), limit: String(PROGRAM_PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters)) if (value?.trim()) query.set(key, value.trim());
  return request(`/api/programs?${query}`, signal);
}
export function getProgramsByCode(code, signal) {
  if (typeof code !== 'string' || !code.trim()) return Promise.reject(new Error('Este registro no tiene un código publicado para consultar su detalle.'));
  return request(`/api/programs/${encodeURIComponent(code)}`, signal);
}
