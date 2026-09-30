import { getRecommendationCatalog } from '../dist/services/programs.service.js';
import { catalogQuality } from '../dist/services/recommendations.js';
try { console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...catalogQuality(await getRecommendationCatalog()) }, null, 2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }
