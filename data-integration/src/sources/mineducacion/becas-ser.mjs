import { load } from 'cheerio';

const BASE = 'https://www.mineducacion.gov.co/portal/micrositios-superior/Becas-SER/';
export const PAGES = {
  home: BASE,
  bank: `${BASE}Banco-de-Programas-de-Becas/`,
  beneficiaries: `${BASE}Informacion-para-Beneficiarios/`,
};
const ID = 'men-becas-ser';
const PROGRAM_ROOT = '#article_i__UMEN_po_PresentacionPortadilla_Becas_1';
const ASSET_BASE = 'https://www.mineducacion.gov.co/1780/';

const clean = v => (v || '').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Accepts "17/05/2021", "4/08/2022" and the malformed "17/052021".
function parseDate(text) {
  const m = clean(text).match(/^(\d{1,2})\/(\d{1,2})\/?(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
    ? date.toISOString().slice(0, 10) : null;
}

// ---- Banco de Programas: institutions grouped by department -------------------
export function parseBank(html) {
  const $ = load(html);
  const stamp = $('p.fecha').first().attr('class')?.match(/iso8601-(\d{4})(\d{2})(\d{2})/);
  const updatedAt = stamp ? `${stamp[1]}-${stamp[2]}-${stamp[3]}` : null;
  const contactNote = fold($('body').text()).includes('contactarse directamente con la institucion');

    const byKey = new Map();
  let department = '';
  $('h2, table').each((_, el) => {
    if (el.name === 'h2') { department = clean($(el).text()); return; }
    if (!department) return;
        $(el).find('tr').each((_, tr) => {
      const cells = $(tr).children('td').map((_, td) => clean($(td).text())).get();
      if (!cells[0] || fold(cells[0]) === 'nombre de la ies') return;
      const key = `${fold(cells[0])}|${fold(department)}`;
      if (!byKey.has(key)) byKey.set(key, { key, name: cells[0], department });
    });
  });
  return { updatedAt, contactNote, institutions: [...byKey.values()] };
}

// ---- Program description + requirements ---------------------------------------
function sectionText($, root, heading) {
  const h = root.find('h3').filter((_, el) => fold($(el).text()) === fold(heading)).first();
  return clean(h.nextUntil('h3', 'p').map((_, p) => $(p).text()).get().join(' '));
}

// Requirements are only emitted if the source text still says so.
const REQUIREMENT_RULES = [
  { test: /estratos 1 2 y 3/, text: 'Pertenecer a los estratos 1, 2 o 3.' },
  { test: /admitidos o matriculados/, text: 'Estar admitido o matriculado en una de las instituciones participantes.' },
];

export function parseProgram(html) {
  const $ = load(html);
  const found = $(PROGRAM_ROOT);
  const root = found.length ? found : $('body');
  const what = sectionText($, root, '¿Qué es el programa de Becas SER?');
  const how = sectionText($, root, '¿Cómo funciona?');
  const text = fold(`${what} ${how}`);
  return {
    description: what,
    requirements: REQUIREMENT_RULES.filter(r => r.test.test(text)).map(r => r.text),
  };
}

// ---- Guide images (linked, not copied) ----------------------------------------

export function parseGuideImages(html, pageUrl) {
  const $ = load(html);
  const baseHref = $('base[href]').first().attr('href');
  const base = baseHref ? new URL(baseHref, pageUrl).href : ASSET_BASE;
  const seen = new Set(); const out = [];
  $('img[src*="articles-"]').each((_, img) => {
    const label = clean($(img).attr('title') || $(img).attr('alt'));
    if (!fold(label).includes('infograf')) return;   // only the procedure infographic
    try {
      const url = new URL($(img).attr('src'), base);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('mineducacion.gov.co') || seen.has(url.href)) return;
      seen.add(url.href);
      out.push({ tipo: 'imagen', url: url.href, titulo: label });
    } catch { /* invalid src: ignore */ }
  });
  return out;
}
// ---- Collector -----------------------------------------------------------------
async function getPage(client, url) {
  const res = await client.get(url);
  if (res.status === 404 || res.status === 410) return { gone: true };
  if (res.status !== 200) throw new Error(`HTTP ${res.status} en ${url}`);   // transient, NOT "gone"
  return { gone: false, html: res.text, url: res.url };
}

export async function collectBecasSer(client) {
  const home = await getPage(client, PAGES.home);
  if (home.gone) return { gone: true, idExterno: ID };

  const bank = await getPage(client, PAGES.bank);
  if (bank.gone) throw new Error('El Banco de Programas ya no está en la URL conocida; revisar a mano.');

  let recursos = [];
  try {
    const guide = await getPage(client, PAGES.beneficiaries);
    if (!guide.gone) recursos = parseGuideImages(guide.html, guide.url);
  } catch { /* optional page */ }

  const program = parseProgram(home.html);
  const { updatedAt, contactNote, institutions } = parseBank(bank.html);
  if (!program.description) throw new Error('No se encontró la descripción: ¿cambió el HTML de la portada?');
  if (institutions.length === 0) throw new Error('El Banco no trajo instituciones: ¿cambió el HTML?');

  return {
    gone: false,
    fuente: 'mineducacion-becas-ser',
    idExterno: ID,
    nombre: 'Becas SER',
    entidad: 'Ministerio de Educación Nacional',
    descripcion: program.description,
    niveles: [],                         // the source doesn't say; the API will show "Todos los niveles"
    tiposApoyo: ['programa'],
    ciudad: 'Colombia',
    region: 'Colombia',
    ubicacion: 'Instituciones de educación superior participantes',
    cobertura: null,
    fechaInicio: null,
    fechaLimite: null,
    aceptaPostulaciones: null,
    requisitosLista: program.requirements,
    enlace: PAGES.home,
    enlaceTerminos: null,
    nota: contactNote
      ? 'Cada institución define sus propios términos y convocatorias: contáctala directamente para postularte.'
      : null,
    recursos,
    instituciones: institutions,
    actualizadoFuente: updatedAt,
    revisadoEn: new Date().toISOString(),
    // If the source text stopped matching our rules, don't publish silently.
    requiereRevision: program.requirements.length < REQUIREMENT_RULES.length || !contactNote,
  };
}
