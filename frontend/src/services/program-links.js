import { websiteUrl } from '../utils/website.js';

const base = (import.meta.env?.VITE_BACKEND_URL || '').replace(/\/+$/, '');
function validateLink(data, sourceId) {
  if (!data || data.sourceId !== sourceId || !['VERIFIED','PENDING','NOT_FOUND','UNAVAILABLE'].includes(data.status)
    || data.status === 'VERIFIED' && (!websiteUrl(data.url) || !Number.isFinite(Date.parse(data.checkedAt)))
    || data.officialName !== undefined && (typeof data.officialName !== 'string' || !data.officialName.trim() || data.officialName.length > 240)) throw new Error('Respuesta de enlace oficial no válida.');
  return { ...data, url: data.status === 'VERIFIED' ? websiteUrl(data.url) : null, officialName: data.status === 'VERIFIED' ? data.officialName?.trim() : undefined };
}
export async function getProgramLink(sourceId, signal) {
  const response = await fetch(`${base}/api/program-links?${new URLSearchParams({ sourceId })}`, { signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new Error('No pudimos consultar el enlace oficial del programa.');
  const data = await response.json();
  return validateLink(data, sourceId);
}

export async function getProgramLinks(sourceIds, signal) {
  const ids = [...new Set(sourceIds)];
  if (!ids.length) return [];
  if (ids.length > 100) throw new Error('Máximo 100 registros por consulta.');
  const query = new URLSearchParams(); ids.forEach(id => query.append('sourceId',id));
  const response = await fetch(`${base}/api/program-links/batch?${query}`, { signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(10000)]) });
  if (!response.ok) throw new Error('No pudimos consultar los nombres oficiales.');
  const payload = await response.json();
  if (!Array.isArray(payload?.data) || payload.data.length !== ids.length || new Set(payload.data.map(row=>row?.sourceId)).size !== ids.length) throw new Error('Respuesta de enlaces oficiales no válida.');
  return payload.data.map(row => { if (!ids.includes(row?.sourceId)) throw new Error('Registro oficial no solicitado.'); return validateLink(row,row.sourceId); });
}
