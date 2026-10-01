import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export function publicAddress(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
export function approvedUrl(value, domains) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port && !['80', '443'].includes(url.port)
      || !domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) throw new Error('Destino fuera de los dominios aprobados');
  url.hash = ''; return url;
}

// DNS is checked for every request, then the approved address is pinned to the connection.
export async function fetchSafe(value, domains, { beforeRequest = async () => {}, maxBytes = 2_000_000, timeout = 8000, redirects = 4, followRedirects = true } = {}) {
  let url = approvedUrl(value, domains);
  for (let hop = 0; hop <= redirects; hop++) {
    await beforeRequest(url);
    let dnsTimer;
    const addresses = await Promise.race([lookup(url.hostname, { all: true }),new Promise((_,reject) => { dnsTimer=setTimeout(() => reject(new Error('Tiempo de DNS agotado')),timeout); })]).finally(() => clearTimeout(dnsTimer));
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('Destino privado o reservado bloqueado');
    const pinned = addresses.find(item => item.family === 4) || addresses[0];
    const result = await new Promise((resolve, reject) => {
      const request = (url.protocol === 'https:' ? https : http).get(url, {
        agent: false, headers: { 'User-Agent': 'EduPlanProgramLinks/1.0', 'Accept-Encoding': 'identity' },
        lookup: (_host, options, callback) => callback(null, options.all ? [pinned] : pinned.address, pinned.family),
      }, response => {
        const chunks = []; let length = 0;
        response.on('error', reject);
        // Status and Location are sufficient for failures/redirects; never consume a huge error page.
        if (response.statusCode !== 200) { resolve({ status:response.statusCode,headers:response.headers,text:'',url:url.href }); response.destroy(); return; }
        if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.destroy(new Error('Respuesta comprimida no admitida')); return; }
        response.on('data', chunk => { length += chunk.length; if (length > maxBytes) response.destroy(new Error('Respuesta demasiado grande')); else chunks.push(chunk); });
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, text: Buffer.concat(chunks).toString('utf8'), url: url.href }));
      });
      const timer = setTimeout(() => request.destroy(new Error('Tiempo de consulta agotado')), timeout);
      request.on('close', () => clearTimeout(timer)); request.on('error', reject);
    });
    if (!followRedirects || ![301, 302, 303, 307, 308].includes(result.status)) return result;
    if (!result.headers.location || hop === redirects) throw new Error('Demasiadas redirecciones');
    url = approvedUrl(new URL(result.headers.location, url).href, domains);
  }
}

export function robotsPolicy(text, userAgent = 'eduplanprogramlinks') {
  const groups = []; let group = null, rulesStarted = false;
  for (const line of text.split(/\r?\n/)) {
    const match = line.replace(/#.*/, '').trim().match(/^([\w-]+)\s*:\s*(.*)$/); if (!match) continue;
    const [, key, value] = match; const field = key.toLowerCase();
    if (field === 'user-agent') { if (!group || rulesStarted) { group = { agents: [], rules: [], delay: 0 }; groups.push(group); rulesStarted = false; } group.agents.push(value.toLowerCase()); }
    else if (group && ['allow', 'disallow', 'crawl-delay'].includes(field)) { rulesStarted = true; if (field === 'crawl-delay') group.delay = Math.max(group.delay, Number(value) || 0); else if (value) group.rules.push({ allow: field === 'allow', path: value }); }
  }
  const specificity = group => Math.max(0,...group.agents.filter(agent => agent && agent !== '*' && userAgent.includes(agent)).map(agent => agent.length));
  const longest = Math.max(0,...groups.map(specificity));
  const specific = longest ? groups.filter(group => specificity(group) === longest) : [];
  const selected = specific.length ? specific : groups.filter(group => group.agents.includes('*'));
  return { sitemaps: [...text.matchAll(/^sitemap:\s*(\S+)/gim)].map(match => match[1]), delay: Math.max(0, ...selected.map(group => group.delay)),
    allows(path) {
      const applicable = selected.flatMap(group => group.rules).filter(rule => {
        const expression = rule.path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\$$/, '$');
        return new RegExp(`^${expression}`).test(path);
      }).sort((a, b) => b.path.replace(/\*/g, '').length - a.path.replace(/\*/g, '').length || Number(b.allow) - Number(a.allow));
      return applicable[0]?.allow ?? true;
    } };
}

export class PoliteClient {
  constructor(domains, { pause = 600, timeout = 8000 } = {}) { this.domains = domains; this.pause = pause; this.timeout = timeout; this.policies = new Map(); this.last = new Map(); this.tails = new Map(); }
  async queued(url, task) {
    const host = url.hostname; const previous = this.tails.get(host) || Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      const delay = Math.max(this.pause, (this.policies.get(url.origin)?.delay || 0) * 1000);
      if (delay > 60000) throw new Error('Crawl-delay requiere ejecución especial');
      await new Promise(resolve => setTimeout(resolve, Math.max(0, delay - (Date.now() - (this.last.get(host) || 0)))));
      try { return await task(); } finally { this.last.set(host, Date.now()); }
    }); this.tails.set(host, current); return current;
  }
  async policy(url) {
    if (this.policies.has(url.origin)) return this.policies.get(url.origin);
    const result = await this.queued(url, () => fetchSafe(`${url.origin}/robots.txt`, this.domains, { redirects: 3, timeout: this.timeout, maxBytes: 256000 }));
    if (result.status !== 404 && result.status !== 410 && result.status !== 200) throw new Error(`No se pudo comprobar robots.txt (${result.status})`);
    const policy = robotsPolicy(result.status === 200 ? result.text : ''); this.policies.set(url.origin, policy); return policy;
  }
  async get(value) {
    let url = approvedUrl(value, this.domains);
    for (let hop = 0; hop < 5; hop++) {
      const policy = await this.policy(url);
      if (!policy.allows(url.pathname + url.search)) throw new Error('Ruta bloqueada por robots.txt');
      let result;
      for (let attempt = 0; attempt < 2; attempt++) {
        try { result = await this.queued(url, () => fetchSafe(url.href, this.domains, { timeout: this.timeout, followRedirects: false })); break; }
        catch (error) { if (attempt || /bloquead|aprobado|reservado|demasiado/i.test(error.message)) throw error; }
      }
      if (![301,302,303,307,308].includes(result.status)) return result;
      if (!result.headers.location) throw new Error('Redirección sin destino');
      url = approvedUrl(new URL(result.headers.location, url).href, this.domains);
    }
    throw new Error('Demasiadas redirecciones');
  }
}
