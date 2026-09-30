import { validSavedItem } from '../utils/saved.js';
import { validInterests } from '../utils/interests.js';

async function request(path, token, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api/me${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('No pudimos conectar con tu cuenta. Los cambios pendientes se conservan en este dispositivo.');
  }
  if (response.status === 401) {
    window.dispatchEvent(new Event('eduplan-auth-rejected'));
    throw new Error('Tu sesión venció. Inicia sesión de nuevo.');
  }
  if (!response.ok) throw new Error(response.status === 403 ? 'Tu cuenta no tiene acceso. Inicia sesión de nuevo.' : 'No pudimos sincronizar tu cuenta. Inténtalo de nuevo.');
  if (response.status === 204) return null;
  return response.json().catch(() => { throw new Error('La respuesta de tu cuenta no es válida. Inténtalo de nuevo.'); });
}
export async function getSaved(token, signal) {
  const payload = await request('/saved', token, { signal });
  if (!Array.isArray(payload?.data) || !payload.data.every(validSavedItem)) throw new Error('La respuesta de guardados no es válida.');
  return payload.data;
}
export function putSaved(item, token, signal) {
  return request(`/saved/${encodeURIComponent(item.id)}`, token, { method: 'PUT', body: { type: item.type, name: item.name, href: item.href, snapshot: item.snapshot || {} }, signal });
}
export function deleteSaved(id, token, signal) { return request(`/saved/${encodeURIComponent(id)}`, token, { method: 'DELETE', signal }); }
export async function getInterests(token, signal) {
  const payload = await request('/interests', token, { signal });
  if (!validInterests(payload)) throw new Error('La respuesta de intereses no es válida.');
  return payload;
}
export async function putInterests(value, token, signal) {
  const payload = await request('/interests', token, { method: 'PUT', body: { areas: value.areas, motivations: value.motivations }, signal });
  if (!validInterests(payload)) throw new Error('La respuesta de intereses no es válida.');
  return payload;
}
