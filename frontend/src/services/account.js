import {emptyRefinement,validRefinement} from '../utils/matching.js';
import { validSavedItem } from '../utils/saved.js';
import { validInterests } from '../utils/interests.js';
import { validPreferences } from '../utils/preferences.js';

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
  if (!response.ok) throw new Error(response.status === 403 ? 'Tu cuenta no tiene acceso. Inicia sesión de nuevo.'
    : path === '/account' && response.status === 409 ? 'Ese teléfono ya pertenece a otra cuenta.'
    : path === '/account' && response.status === 400 ? 'Revisa el nombre y el teléfono antes de guardar.'
    : 'No pudimos sincronizar tu cuenta. Inténtalo de nuevo.');
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
export async function getPreferences(token, signal) {
  const value = await request('/preferences', token, { signal });
  if (!validPreferences(value)) throw new Error('Respuesta de preferencias no válida.');
  return value;
}
export async function putPreferences(value, token, signal) {
  const result = await request('/preferences', token, { method: 'PUT', body: value, signal });
  if (!validPreferences(result)) throw new Error('Respuesta de preferencias no válida.');
  return result;
}
function validAccount(value) {
  return value && Number.isInteger(value.userId) && typeof value.name === 'string'
    && typeof value.email === 'string' && (value.phone === null || typeof value.phone === 'string');
}
export async function getAccount(token, signal) {
  const value = await request('/account', token, { signal });
  if (!validAccount(value)) throw new Error('La respuesta de tu cuenta no es válida.');
  return value;
}
export async function putAccount(value, token, signal) {
  const result = await request('/account', token, { method: 'PUT', body: value, signal });
  if (!validAccount(result)) throw new Error('La respuesta de tu cuenta no es válida.');
  return result;
}

export async function getMatchingPreferences(token,signal) {
  const value=await request('/matching-preferences',token,{signal});
  if(!validRefinement(value))throw new Error('No pudimos leer tus respuestas de afinación.');
  return {...emptyRefinement,...value};
}
export async function putMatchingPreferences(value,token,signal) {
  const result=await request('/matching-preferences',token,{method:'PUT',body:value,signal});
  if(!validRefinement(result))throw new Error('No pudimos confirmar el guardado de tu afinación.');
  return {...emptyRefinement,...result};
}
