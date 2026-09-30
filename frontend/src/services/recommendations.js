import { normalizeProgram } from '../utils/programs.js';
export async function getRecommendations(profile, { limit = 20, sourceIds, excludedSourceIds = [], signal } = {}) {
  const response = await fetch('/api/recommendations', { method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ preferences:profile.preferences, areas:profile.interests.areas, limit, excludedSourceIds, ...(sourceIds ? {sourceIds} : {}) }),
    signal:AbortSignal.any([...(signal ? [signal] : []),AbortSignal.timeout(60000)]) });
  if (!response.ok) throw new Error('No pudimos consultar las recomendaciones. Reintenta en unos momentos.');
  const payload = await response.json();
  if (!['OK','NO_RESULTS','INCOMPLETE_PROFILE'].includes(payload?.status) || !Array.isArray(payload.data) || payload.data.length > 50) throw new Error('Respuesta de recomendaciones no válida.');
  return { ...payload,data:payload.data.map(row=> {
    if (!Number.isInteger(row?.score) || row.score < 0 || row.score > 100 || !['reasons','matchedCriteria','unmatchedCriteria','missingInformation'].every(k=>Array.isArray(row[k]) && row[k].every(v=>typeof v==='string'))) throw new Error('Puntuación no válida.');
    return {...row,program:normalizeProgram(row.program)};
  }) };
}
