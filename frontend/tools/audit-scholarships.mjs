// Editorial checks never rewrite verification dates or infer whether applications are open.
import { scholarships } from '../src/data/scholarships.js';
import { auditScholarships, scholarshipStatus } from '../src/services/scholarships.js';
const audit = auditScholarships(scholarships);
const counts = scholarships.reduce((result, item) => { const state = scholarshipStatus(item); result[state] = (result[state] || 0) + 1; return result; }, {});
console.log(JSON.stringify({ opportunities: scholarships.length, counts, ...audit }, null, 2));
if (process.argv.includes('--links')) {
  const urls = [...new Set(scholarships.flatMap(item => [item.officialUrl, item.termsUrl, item.applicationUrl]).filter(Boolean))];
  for (let offset = 0; offset < urls.length; offset += 4) {
    const batch = await Promise.all(urls.slice(offset, offset + 4).map(async url => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'follow' });
        await response.body?.cancel();
        return { url, http: response.status, finalUrl: response.url, needsManualReview: !response.ok };
      } catch (error) { return { url, needsManualReview: true, error: error.message }; }
    }));
    for (const result of batch) console.log(JSON.stringify(result));
  }
}
if (audit.errors.length) process.exitCode = 1;
