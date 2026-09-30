import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fetchSafe, approvedUrl, PoliteClient } from './network.mjs';
import { extractPage, sitemapLinks, programPath, discoveryPriority, matchPage, fold } from './extract.mjs';
import { transformProgram } from '../../dist/services/programs.service.js';

export async function saveJson(path, value) { await mkdir(dirname(path), { recursive: true }); await writeFile(path + '.tmp', JSON.stringify(value, null, 2)); await rename(path + '.tmp', path); }
export async function readJson(path, fallback) { try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; } }
const sourceDomain = ['www.datos.gov.co'];
async function sourceRows(id, select) {
  const result = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const url = new URL(`https://www.datos.gov.co/resource/${id}.json`);
    url.searchParams.set('$select', select); url.searchParams.set('$order', ':id'); url.searchParams.set('$limit', '1000'); url.searchParams.set('$offset', String(offset));
    const response = await fetchSafe(url.href, sourceDomain, { timeout: 20000, maxBytes: 5_000_000 });
    if (response.status !== 200) throw new Error(`Catálogo ${id}: HTTP ${response.status}`);
    const rows = JSON.parse(response.text); if (!Array.isArray(rows)) throw new Error('Catálogo no válido');
    result.push(...rows); if (rows.length < 1000) return result;
  }
  throw new Error('Catálogo excede el límite; no se usará una descarga incompleta');
}
export async function catalog() {
  const programs = (await sourceRows('upr9-nkiz', ':id as source_row_id,codigoprograma,codigoinstitucion,nombreinstitucion,nombreprograma,nombretituloobtenido,nombrenbc,nombrenivelacademico,nombrenivelformacion,nombremetodologia,cantidadperiodos,nombreperiodicidad,nombredepartprograma,nombremunicipioprograma,nombreestadoprograma')).map(transformProgram);
  const institutions = await sourceRows('n5yy-8nav', 'c_digo_instituci_n,nombre_instituci_n,p_gina_web');
  const websites = new Map(institutions.map(item => [item.c_digo_instituci_n, item.p_gina_web || '']));
  const byInstitution = new Map();
  for (const program of programs) {
    if (!byInstitution.has(program.institutionCode)) byInstitution.set(program.institutionCode, { code: program.institutionCode, name: program.institutionName, website: websites.get(program.institutionCode) || '', programs: [] });
    byInstitution.get(program.institutionCode).programs.push(program);
  }
  return { checkedAt: new Date().toISOString(), institutions: [...byInstitution.values()] };
}
export function domainFromWebsite(website) {
  const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
  const domain = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain) || ['com','co','edu.co','com.co','gov.co','org.co','net.co','org','net'].includes(domain)) throw new Error('Sitio institucional no utilizable');
  approvedUrl(url.href, [domain]); return { domain, url: url.href };
}
const adapters = {
  'uniandes.edu.co': ['https://www.uniandes.edu.co/es/oferta-academica/programas'],
  'javeriana.edu.co': ['https://www.javeriana.edu.co/estudia-en-la-javeriana/inicio'],
  'unal.edu.co': ['https://pregrado.unal.edu.co/presentacion_programas_pre', 'https://admisiones.unal.edu.co/pregrado/oferta-de-programas-curriculares/'],
};
export async function collectInstitution(institution, { maxPages = 30, maxSitemaps = 6, timeout = 8000, contrastedSnies = {}, client } = {}) {
  const report = { institutionCode: institution.code, institutionName: institution.name, records: institution.programs.length, limits: { maxPages, maxSitemaps, timeoutMs: timeout }, attemptedAt: new Date().toISOString(), pagesChecked: 0, sitemapsChecked: 0, candidates: [], errors: [], needsAdapter: false, limited: false };
  let origin;
  try { origin = domainFromWebsite(institution.website); } catch (error) { return { ...report, outcome: 'NO_WEBSITE', errors: [error.message] }; }
  report.domain = origin.domain;
  client ||= new PoliteClient([origin.domain], { timeout });
  const seen = new Set(), queue = [origin.url, ...(adapters[origin.domain] || [])];
  const queued = new Set(queue), sitemapQueue = [], sitemapSeen = new Set();
  try {
    const policy = await client.policy(new URL(origin.url));
    sitemapQueue.push(...policy.sitemaps, new URL('/sitemap.xml', origin.url).href);
  } catch (error) {
    report.errors.push(error.message);
    if (!adapters[origin.domain]?.length) return { ...report, outcome: 'ROBOTS_UNAVAILABLE', needsAdapter: true };
    // Official adapter seeds may use a live subdomain when the catalog homepage has disappeared.
    // Each seed still checks its own robots.txt; the failed origin is never bypassed.
    queue.shift();
  }
  const add = value => {
    try {
      const url = approvedUrl(value, [origin.domain]);
      if (url.search || /\.(pdf|jpg|png|zip|docx?|xlsx?|mp[34])$/i.test(url.pathname)) return;
      if (!queued.has(url.href) && programPath(url.href) && queued.size < 10000) { queued.add(url.href); queue.push(url.href); }
    } catch { /* foreign or malformed URLs are never followed */ }
  };
  while (sitemapQueue.length && sitemapSeen.size < maxSitemaps) {
    const value = sitemapQueue.shift(); if (sitemapSeen.has(value)) continue; sitemapSeen.add(value);
    try {
      approvedUrl(value, [origin.domain]); const response = await client.get(value); report.sitemapsChecked++;
      if (response.status !== 200) { report.errors.push(`Sitemap HTTP ${response.status}: ${value}`); continue; }
      const links = sitemapLinks(response.text); sitemapQueue.push(...links.indexes.slice(0, 100)); links.pages.forEach(add);
    } catch (error) { report.errors.push(`Sitemap ${value}: ${error.message}`); }
  }
  while (queue.length && seen.size < maxPages) {
    if (seen.size) queue.sort((a,b) => discoveryPriority(a)-discoveryPriority(b) || a.localeCompare(b,'es'));
    const value = queue.shift(); if (seen.has(value)) continue; seen.add(value);
    try {
      const response = await client.get(value); report.pagesChecked++;
      if (response.status !== 200 || !response.headers['content-type']?.includes('html')) { report.errors.push(`Página HTTP ${response.status}: ${value}`); continue; }
      const page = extractPage(response.text, response.url);
      // Only publish the actually fetched URL; canonical targets are hints requiring another check.
      if (page.url !== response.url) { add(page.url); page.url = response.url; }
      page.links.forEach(add); report.needsAdapter ||= page.dynamic;
      if (programPath(response.url) && new URL(response.url).pathname !== '/') {
        report.candidates.push(...matchPage(page, institution.programs, contrastedSnies).map(candidate => ({ ...candidate, checkedAt: new Date().toISOString(), evidence: { ...candidate.evidence, fetchedUrl: response.url } })));
      }
    } catch (error) { report.errors.push(`Página ${value}: ${error.message}`); }
  }
  report.limited = queue.length > 0 || sitemapQueue.length > 0;
  // Two fully identified URLs are ambiguous. A weak candidate cannot override
  // the sole URL whose published identity was verified completely.
  const unique = new Map(); for (const item of report.candidates) unique.set(item.sourceId + '\n' + item.url, item);
  report.candidates = [...unique.values()];
  const ambiguous = new Set(report.candidates.filter(item => item.status === 'VERIFIED').filter(item => report.candidates.filter(other => other.sourceId === item.sourceId && other.status === 'VERIFIED').length > 1).map(item => item.sourceId));
  for (const item of report.candidates) if (ambiguous.has(item.sourceId)) item.status = 'PENDING';
  report.needsAdapter ||= !report.candidates.length;
  report.outcome = report.candidates.length ? 'CANDIDATES' : report.errors.length && !report.pagesChecked ? 'FAILED' : 'NO_MATCH';
  return report;
}
export function summarize(reports, total) {
  const candidates = reports.flatMap(item => item.candidates);
  return { institutionsInCatalog: total, institutionsAttempted: reports.length, recordsInAttemptedInstitutions: reports.reduce((sum,item) => sum + item.records,0),
    recordsWithVerifiedLink: new Set(candidates.filter(item => item.status === 'VERIFIED').map(item => item.sourceId)).size,
    recordsWithPendingCandidate: new Set(candidates.filter(item => item.status === 'PENDING').map(item => item.sourceId)).size,
    recordsWithoutCandidate: reports.reduce((sum,item) => sum + item.records,0) - new Set(candidates.map(item => item.sourceId)).size,
    candidates: candidates.length, institutionsNeedingAdapter: reports.filter(item => item.needsAdapter).length,
    institutionsWithoutWebsite: reports.filter(item => item.outcome === 'NO_WEBSITE').length,
    institutionsWithErrors: reports.filter(item => item.errors.length).length, limitedInstitutions: reports.filter(item => item.limited).length };
}
export function reviewReport(state) {
  const text=value=>String(value ?? '').replace(/[<>]/g,'').replace(/\|/g,'\\|').replace(/\s+/g,' ').trim();
  const summary=state.summary;
  const lines=['# Descubrimiento de enlaces oficiales','', '**Resultados de recopilación. La publicación se registra por separado en el reporte de importación.**','',
    `Catálogo: ${summary.institutionsInCatalog} instituciones, ${summary.recordsInAttemptedInstitutions} registros. Intentos: ${summary.institutionsAttempted}.`,
    `Registros con enlace verificado: ${summary.recordsWithVerifiedLink}. Registros con candidatos pendientes: ${summary.recordsWithPendingCandidate}. Candidatos: ${summary.candidates}.`,
    'Un mismo registro puede tener un enlace verificado y otra alternativa pendiente. Los conteos no representan cobertura completa.', '',
    `Instituciones sin web: ${summary.institutionsWithoutWebsite}; con errores: ${summary.institutionsWithErrors}; recorridos limitados: ${summary.limitedInstitutions}.`, '',
    'Consultar report.json para errores completos y límites de cada ejecución, candidates.json para importar después de revisar, y domains-proposed.json para revisar dominios.', '',
    '## Enlaces verificados','', '| Registro de fuente | Institución | Página oficial |','|---|---|---|'];
  for(const item of state.reports.flatMap(report=>report.candidates).filter(item=>item.status==='VERIFIED')) lines.push(`| ${text(item.sourceId)} | ${text(item.institutionCode)} | ${text(item.url)} |`);
  lines.push('', '## Todas las instituciones intentadas','', '| Código | Institución | Resultado | Páginas | Candidatos | Errores | Limitado |','|---|---|---|---:|---:|---:|---|');
  for(const item of [...state.reports].sort((a,b)=>a.institutionCode.localeCompare(b.institutionCode))) lines.push(`| ${text(item.institutionCode)} | ${text(item.institutionName)} | ${text(item.outcome)} | ${item.pagesChecked} | ${item.candidates.length} | ${item.errors.length} | ${item.limited?'Sí':'No'} |`);
  return lines.join('\n')+'\n';
}
export async function collect(options) {
  const snapshotPath = options.out + '/catalog.json';
  let snapshot = await readJson(snapshotPath, null);
  if (!snapshot) { snapshot = await catalog(); await saveJson(snapshotPath, snapshot); }
  let state = await readJson(options.out + '/report.json', { version: 1, startedAt: new Date().toISOString(), reports: [] });
  if (!state.executions) state.executions = state.reports.length ? [{ startedAt:state.startedAt,limits:state.limits,institution:'all' }] : [];
  state.limits = { maxPages: options.maxPages, maxSitemaps: options.maxSitemaps, timeoutMs: options.timeout };
  state.executions.push({ startedAt:new Date().toISOString(),limits:state.limits,institution:options.institution || 'all',pending:options.pending });
  state.catalogCheckedAt = snapshot.checkedAt;
  const contrast = options.contrast ? await readJson(options.contrast, {}) : {};
  // Contrast file is an administrator-reviewed sourceId->SNIES mapping, never inferred from source code.
  const contrastedSnies = Object.fromEntries(Object.entries(contrast).filter(([, value]) => typeof value === 'string' && /^\d{3,8}$/.test(value)));
  const institutions = snapshot.institutions.filter(item => !options.institution || item.code === options.institution);
  if (!institutions.length) throw new Error('Institución no encontrada en el catálogo');
  let cursor = 0;
  const clients = new Map();
  let completed = 0;
  await Promise.all(Array.from({ length: options.concurrency || 3 }, async () => {
    while (cursor < institutions.length) {
      const institution = institutions[cursor++];
      const previous = state.reports.find(item => item.institutionCode === institution.code);
      if (previous && options.resumeSince && Date.parse(previous.attemptedAt) >= Date.parse(options.resumeSince)) continue;
      if (previous && !options.pending) continue;
      if (previous && options.pending && previous.candidates.length && previous.candidates.every(item => item.status === 'VERIFIED') && !previous.needsAdapter && !previous.limited && !previous.errors.length) continue;
      let client;
      try { const { domain } = domainFromWebsite(institution.website); if (!clients.has(domain)) clients.set(domain, new PoliteClient([domain], { timeout: options.timeout })); client = clients.get(domain); } catch { /* reported by collector */ }
      const report = await collectInstitution(institution, { maxPages: options.maxPages, maxSitemaps: options.maxSitemaps, timeout: options.timeout, contrastedSnies, client });
      // Persist through a serialized writer so concurrent institutions cannot overwrite checkpoint files.
      state.reports = state.reports.filter(item => item.institutionCode !== institution.code); state.reports.push(report);
      state.summary = summarize(state.reports, snapshot.institutions.length); state.updatedAt = new Date().toISOString();
      await checkpoint();
      console.log(`${++completed} revisadas en esta ejecución, ${state.reports.length}/${snapshot.institutions.length} intentadas: ${institution.code}: ${report.outcome}, ${report.candidates.length} candidatos`);
    }
  }));
  state.summary = summarize(state.reports, snapshot.institutions.length);
  await checkpoint();
  letSave = letSave.then(() => saveJson(options.out + '/candidates.json', state.reports.flatMap(item => item.candidates))); await letSave;
  await writeFile(options.out + '/report.md',reviewReport(state));
  return state.summary;
  function checkpoint() { const copy = structuredClone(state); letSave = letSave.then(() => saveJson(options.out + '/report.json', copy)); return letSave; }
}
let letSave = Promise.resolve();

export async function checkCandidate(candidate, client) {
  if(candidate.status !== 'VERIFIED') return { temporaryError:'El mantenimiento solo admite enlaces previamente verificados',id:candidate.id };
  try {
    const response = await client.get(candidate.url);
    if ([404,410].includes(response.status)) return { ...candidate, status: 'UNAVAILABLE', checkedAt: new Date().toISOString(), evidence: { reason: `HTTP ${response.status}` } };
    if (response.status !== 200) return { temporaryError: `HTTP ${response.status}`, id: candidate.id };
    const page = extractPage(response.text, response.url);
    const old = typeof candidate.evidence === 'string' ? JSON.parse(candidate.evidence) : candidate.evidence;
    const meaningful = [...page.primaryHeadings,page.awardedTitle].map(fold);
    const previous = [...(old.primaryHeadings || []),...(old.matchedNames || [])].map(fold).filter(value => value.length > 3);
    const general = new URL(response.url).pathname === '/' || !previous.some(value => meaningful.includes(value)) || response.url !== candidate.url && !programPath(response.url);
    if (!previous.length || general && page.dynamic) return { temporaryError: 'Falta evidencia suficiente: requiere revisión', id: candidate.id };
    return { ...candidate, url: candidate.url, status: general ? 'UNAVAILABLE' : 'VERIFIED', checkedAt: new Date().toISOString(), evidence: { ...old, maintenanceUrl: response.url, reason: general ? 'El destino ya no identifica el programa' : 'Enlace revisado' } };
  } catch (error) { return { temporaryError: error.message, id: candidate.id }; }
}
