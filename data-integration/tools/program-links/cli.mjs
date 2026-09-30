import { resolve } from 'node:path';
import { collect, readJson, saveJson, checkCandidate, domainFromWebsite } from './collect.mjs';
import { PoliteClient } from './network.mjs';

const [command, ...args] = process.argv.slice(2);
const flags = {};
for (let index = 0; index < args.length; index++) {
  if (!args[index].startsWith('--')) throw new Error('Argumento no válido');
  const key = args[index].slice(2); flags[key] = args[index + 1] && !args[index + 1].startsWith('--') ? args[++index] : true;
}
const out = resolve(flags.out || '../.tools/program-links');
function number(key, fallback, max) { const value = Number(flags[key] ?? fallback); if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`--${key} no válido`); return value; }
async function admin(path, method = 'GET', body) {
  const token = process.env.PROGRAM_LINKS_ADMIN_TOKEN;
  if (!token || Buffer.byteLength(token) < 32) throw new Error('Configure PROGRAM_LINKS_ADMIN_TOKEN (mínimo 32 bytes)');
  const base = process.env.PROGRAM_LINKS_BACKEND_URL || 'http://127.0.0.1:8080';
  const target = new URL(base);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.protocol === 'http:' && !['127.0.0.1','localhost','[::1]'].includes(target.hostname)) throw new Error('Use HTTPS para administrar un backend remoto');
  const response = await fetch(new URL('/api/admin/program-links' + path, target), { method, headers: { 'Content-Type': 'application/json', 'X-Program-Links-Token': token }, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Administración: HTTP ${response.status}`);
  return response.json();
}
async function listing(status) { const rows = []; for (let offset = 0; ; offset += 100) { const response = await admin(`?status=${status}&offset=${offset}`); rows.push(...response.data); if (response.data.length < 100) break; } return rows; }
try {
  if (command === 'collect') {
    if (flags['resume-since'] && (!flags.pending || !Number.isFinite(Date.parse(flags['resume-since'])))) throw new Error('--resume-since requiere --pending y una fecha ISO');
    console.log(JSON.stringify(await collect({ out, institution: flags.institution, pending: Boolean(flags.pending), resumeSince:flags['resume-since'], concurrency:number('concurrency',3,12), contrast: flags.contrast && resolve(flags.contrast), maxPages: number('max-pages',30,500), maxSitemaps: number('max-sitemaps',6,50), timeout: number('timeout',8000,30000) }), null, 2));
  } else if (command === 'import') {
    if (!flags.file || !flags.domains) throw new Error('Requiere --file candidates.json y --domains approved-domains.json revisado por administrador');
    const domains = await readJson(resolve(flags.domains), null), rows = await readJson(resolve(flags.file), null);
    if (!Array.isArray(domains) || !Array.isArray(rows)) throw new Error('Archivos de importación no válidos');
    for (let index = 0; index < domains.length; index += 500) await admin('/domains','POST',domains.slice(index,index+500));
    let imported = 0;
    for (let index = 0; index < rows.length; index += 100) imported += (await admin('/import','POST',rows.slice(index,index+100))).imported;
    console.log(JSON.stringify({ imported }));
  } else if (command === 'export') {
    const status = flags.status || 'PENDING'; if (!['PENDING','VERIFIED','REJECTED','UNAVAILABLE'].includes(status)) throw new Error('Estado no válido');
    const rows = await listing(status); await saveJson(resolve(flags.file || out + '/pending.json'),rows); console.log(JSON.stringify({ exported:rows.length }));
  } else if (command === 'approve' || command === 'reject') {
    if (!/^[a-f0-9]{64}$/.test(flags.id || '') || typeof flags.reason !== 'string') throw new Error('Requiere --id y --reason');
    console.log(JSON.stringify(await admin(`/${flags.id}/decision`,'POST',{ status:command === 'approve' ? 'VERIFIED':'REJECTED',reason:flags.reason })));
  } else if (command === 'history') {
    if (!/^[a-f0-9]{64}$/.test(flags.id || '')) throw new Error('Requiere --id');
    console.log(JSON.stringify(await admin(`/${flags.id}/history`),null,2));
  } else if (command === 'check') {
    // This command only writes a reviewable file. Importing is a separate, explicit operation.
    if (!flags.domains) throw new Error('Requiere --domains approved-domains.json');
    const domains = await readJson(resolve(flags.domains),[]); const rows = flags.file ? await readJson(resolve(flags.file),[]) : await listing('VERIFIED');
    const clients = new Map(), checked = [], errors = [];
    for (const row of rows) {
      const allowed = domains.filter(item => item.institutionCode === row.institutionCode).map(item => item.domain);
      if (!allowed.length) { errors.push({ id:row.id,error:'Sin dominios aprobados' }); continue; }
      const key = allowed.join(','); if (!clients.has(key)) clients.set(key,new PoliteClient(allowed));
      const result = await checkCandidate(row,clients.get(key)); if (result.temporaryError) errors.push(result); else checked.push(result);
    }
    await saveJson(out + '/maintenance.json',checked); await saveJson(out + '/maintenance-errors.json',errors);
    console.log(JSON.stringify({ checked:checked.length,temporaryErrors:errors.length,withdrawn:checked.filter(item => item.status === 'UNAVAILABLE').length }));
  } else if (command === 'domains') {
    const snapshot = await readJson(out + '/catalog.json',null); if (!snapshot) throw new Error('Ejecute collect primero');
    const domains = snapshot.institutions.flatMap(item => { try { return [{ institutionCode:item.code,domain:domainFromWebsite(item.website).domain }]; } catch { return []; } });
    await saveJson(out + '/domains-proposed.json',domains); console.log('Revise domains-proposed.json antes de usarlo como approved-domains.json.');
  } else {
    console.log('Program links: collect [--institution CODE|--pending] [--out DIR] [--max-pages 30] [--max-sitemaps 6] [--contrast FILE]\n domains --out DIR\n import --file FILE --domains FILE\n export [--status PENDING] [--file FILE]\n approve|reject --id ID --reason TEXT\n history --id ID\n check --domains FILE [--file FILE] [--out DIR]');
    if (command && command !== 'help') process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
