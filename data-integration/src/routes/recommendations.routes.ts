import { Router } from 'express';
import { getRecommendationCatalog } from '../services/programs.service.js';
import { recommendPrograms, scoreProgram, type RecommendationProfile } from '../services/recommendations.js';
import { RECOMMENDATION_CONFIG as config } from '../config/recommendations.js';
export const recommendationsRouter = Router();
// Stateless calculation: identity and persisted preferences live at authenticated /api/me.
// No account id, token, user history or profile is persisted or cached here.
recommendationsRouter.post('/', async (request, response) => {
  const { preferences, areas, limit = 20, excludedSourceIds = [], sourceIds } = request.body ?? {};
  if (!preferences || !['academicLevel','modality','municipality','department','mobility'].every(key => typeof preferences[key] === 'string' && preferences[key].length <= 100)
    || !['','Pregrado','Posgrado'].includes(preferences.academicLevel) || !['','CITY','DEPARTMENT','ANY','RELOCATE'].includes(preferences.mobility)
    || !['','Presencial','Presencial-Virtual','Virtual','A distancia'].includes(preferences.modality)
    || !Array.isArray(areas) || areas.length > 7 || !areas.every(a => typeof a === 'string' && Object.hasOwn(config.taxonomy, a))
    || !Number.isInteger(limit) || limit < 1 || limit > config.maxResults
    || !Array.isArray(excludedSourceIds) || excludedSourceIds.length > 200 || !excludedSourceIds.every(id => typeof id === 'string' && id.length <= 200)
    || sourceIds !== undefined && (!Array.isArray(sourceIds) || sourceIds.length > 3 || !sourceIds.every(id => typeof id === 'string' && id.length <= 200 && /^upr9-nkiz:[\w.~-]+$/.test(id))))
    return response.status(400).json({ message: 'Preferencias o límites no válidos' });
  const profile: RecommendationProfile = { preferences, areas };
  const empty = recommendPrograms([],profile,limit);
  if (empty.status === 'INCOMPLETE_PROFILE') return response.json(empty);
  try {
    const catalog = await getRecommendationCatalog();
    if (sourceIds) return response.json({ data: catalog.filter(p => sourceIds.includes(p.sourceId)).flatMap(p => { const result = scoreProgram(p,profile); return result ? [result] : []; }), status: 'OK', algorithmVersion: config.version });
    return response.json(recommendPrograms(catalog,profile,limit,excludedSourceIds));
  } catch { return response.status(502).json({ message: 'No fue posible consultar el catálogo para recomendar. Reintenta.' }); }
});
