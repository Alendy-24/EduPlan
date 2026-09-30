import { normalizeProgram } from '../utils/programs';
// Programs use the same-origin proxy; institutions keep their existing configurable URL.
const baseUrl = '';
export const PROGRAM_PAGE_SIZE = 12;
async function request(path, signal) {
  const response = await fetch(`${baseUrl}${path}`, { signal });
  if (!response.ok) throw new Error(response.status === 404 ? 'Programa no encontrado.' : 'No pudimos consultar el catálogo de programas. Inténtalo de nuevo.');
  const payload = await response.json();
  if (!Array.isArray(payload.data)) throw new Error('Respuesta de programas no válida');
  return payload.data.map(normalizeProgram);
}
export function getPrograms(filters, page, signal) {
  const query = new URLSearchParams({ page: String(page), limit: String(PROGRAM_PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters)) if (value?.trim()) query.set(key, value.trim());
  return request(`/api/programs?${query}`, signal);
}
export function getProgramsByCode(code, signal) {
  if (!/^\d+$/.test(code)) return Promise.reject(new Error('Código de programa inválido.'));
  return request(`/api/programs/${encodeURIComponent(code)}`, signal);
}
