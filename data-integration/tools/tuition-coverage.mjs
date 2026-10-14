import { mkdirSync, writeFileSync } from 'node:fs';
import { getRecommendationCatalog } from '../dist/services/programs.service.js';
import { tuitionCoverage } from '../dist/services/tuition-coverage.js';
try {
  const report={checkedAt:new Date().toISOString(),...tuitionCoverage(await getRecommendationCatalog())};
  const directory=new URL('../../.tools/tuition/',import.meta.url);mkdirSync(directory,{recursive:true});
  writeFileSync(new URL('coverage.json',directory),JSON.stringify(report,null,2)+'\n');
  const {institutions,missing,...summary}=report;
  console.log(JSON.stringify({...summary,institutions:institutions.length,missing:missing.length},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
