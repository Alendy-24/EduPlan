// data-integration/src/sources/icetex/creditos.mjs
// Planes de financiación de ICETEX (listado de pregrado + una página por plan).
import { load } from 'cheerio';

const ORIGIN = 'https://web.icetex.gov.co';
export const LISTINGS = [`${ORIGIN}/creditos/tu-eliges/pregrado`];   // posgrado se agrega después
export const SOURCE = 'icetex';

const clean = v => (v || '').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isIcetex = host => host === 'icetex.gov.co' || host.endsWith('.icetex.gov.co');

function icetexUrl(href, base) {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    return url.protocol === 'https:' && isIcetex(url.hostname) ? url : null;
  } catch { return null; }
}

// Cada <br> separa una línea (el h1 del plan trae nombre, línea y eslogan en un solo elemento).
function textLines($, element) {
  const copy = $(element).clone();
  copy.find('br').replaceWith('\n');
  return copy.text().split('\n').map(clean).filter(Boolean);
}

// ---- Listado ----------------------------------------------------------------------
// "Financia hasta el 100% de la matrícula…" viene en el párrafo de introducción del listado.
export function parseCoverage(html) {
  const $ = load(html);
  const intro = $('h1').filter((_, el) => fold($(el).text()) === 'planes de financiacion').first().next('p');
  const phrase = intro.find('strong').map((_, el) => clean($(el).text())).get()
    .find(text => fold(text).startsWith('hasta el'));
  return phrase ? `Financia ${phrase}.` : null;
}

export function parseListing(html, pageUrl = LISTINGS[0]) {
  const $ = load(html);
  const cards = new Map();
  // El bloque "quiero preinscribirme" también es .preins pero no tiene <h2>.
  $('.preins h2').each((_, h2) => {
    const card = $(h2).parent();
    const url = icetexUrl(card.find('a.solicitar_becas').first().attr('href'), pageUrl);
    if (!url || cards.has(url.href)) return;
    cards.set(url.href, {
      name: clean($(h2).text()),
      url: url.href,
      listedAsUnavailable: fold(card.find('.portlet-msg-info').text()).includes('no se encuentra disponible'),
    });
  });
  return [...cards.values()];
}

// ---- Página de un plan --------------------------------------------------------------
// Devuelve el registro para el backend o { skipped, url } si no es un crédito de educación superior.
export function parsePlan(html, url, coverage = null) {
  const $ = load(html);
  const heading = $('h1').filter((_, el) => clean($(el).text())).first();   // hay un <h1> vacío antes del real
  const [line0, line1, tagline] = textLines($, heading);
  const name = [line0, line1].filter(Boolean).join(' · ');

  // Indicadores: "Estudio / Crédito / Estudiar en / Tasa / Para población".
  const facts = {};
  $('.indicadores_creditos').each((_, el) => {
    const label = clean($(el).find('.negri_ta_creditos').first().text());
    if (label) facts[fold(label)] = clean($(el).text()).slice(label.length).trim();
  });

  const levelText = fold(facts.estudio);
  const niveles = ['pregrado', 'posgrado'].filter(level => levelText.includes(level));
  if (!name || niveles.length === 0) return { skipped: 'sin indicador de nivel (pregrado/posgrado)', url };

  const slug = new URL(url).pathname.split('/').filter(Boolean).pop()
    ?.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) return { skipped: 'URL sin identificador estable', url };

  // Solo el DOM visible: el "Convocatoria abierta" que ves en el código está dentro de comentarios HTML.
  const body = $('.cuerpo_comunicado_creditos').first();
  const paragraphs = body.find('p').map((_, p) => clean($(p).text())).get();
  const whileStudying = paragraphs.find(text => fold(text).startsWith('mientras estudias'));
  const afterStudying = paragraphs.find(text => fold(text).startsWith('despues de terminado'));
  const subplans = body.find('section p').map((_, p) => {
    const title = clean($(p).find('strong').first().text());
    const text = clean($(p).text());
    const detail = title && text.startsWith(title) ? clean(text.slice(title.length)) : '';
    return detail ? `${title}: ${detail}` : null;
  }).get();

  // false = la página dice que no está disponible; true = dice "Convocatoria abierta"; null = no dice nada.
  const banner = fold(body.find('.portlet-msg-info').text());
  const accepting = /no se encuentra disponible|convocatoria cerrada/.test(banner) ? false
    : banner.includes('convocatoria abierta') ? true : null;

  // El botón "Solicitar tu crédito" sigue en el HTML aunque el plan no esté disponible: solo se usa si está abierto.
  const applyUrl = icetexUrl($('.dst_btns_creditos a[href*="solicitudes.icetex.gov.co"]').first().attr('href'), url);

  const rate = (facts.tasa || '').split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)[0].replace(/\.$/, '');
  const place = facts['estudiar en'] || '';
  const placeText = fold(place);
  const region = placeText.includes('colombia') ? 'Colombia' : placeText.includes('exterior') ? 'Exterior' : null;

  return {
    fuente: SOURCE,
    idExterno: `icetex-${slug}`,
    nombre: name,
    entidad: 'ICETEX',
    descripcion: [tagline, whileStudying].filter(Boolean).join(' ') || 'Plan de financiación educativa de ICETEX.',
    niveles,
    tiposApoyo: ['credito'],
    ciudad: region,
    region,
    ubicacion: place || null,
    ciclo: facts.credito ? `Crédito ${facts.credito.toLowerCase()}` : null,
    cobertura: [coverage, afterStudying].filter(Boolean).join(' ') || null,
    fechaInicio: null,        // las fechas parecen estar en los calendarios de ICETEX, no en esta página
    fechaLimite: null,
    aceptaPostulaciones: accepting,
    requisitosLista: [
      facts.estudio && `Estudiar un programa de ${facts.estudio.toLowerCase()}${place ? ` en ${place}` : ''}.`,
      facts['para poblacion'] && `Dirigido a: ${facts['para poblacion']}.`,
      ...subplans,
    ].filter(Boolean),
    enlace: url,
    enlaceTerminos: null,
    enlacePostulacion: accepting === true && applyUrl ? applyUrl.href : null,
    nota: rate ? `Tasa: ${rate}.` : null,
    recursos: [],
    instituciones: null,      // null = el backend no toca las instituciones aliadas
    requiereRevision: false,
  };
}

// ---- Recolector ---------------------------------------------------------------------
async function getPage(client, url) {
  const res = await client.get(url);
  if (res.status === 404 || res.status === 410) return { gone: true };
  if (res.status !== 200) throw new Error(`HTTP ${res.status} en ${url}`);   // transitorio, NO "desaparecido"
  return { gone: false, html: res.text, url: res.url };
}

export async function collectIcetex(client) {
  const cards = new Map();
  let coverage = null;
  for (const listing of LISTINGS) {
    const page = await getPage(client, listing);
    if (page.gone) throw new Error(`El listado ya no existe: ${listing}`);
    coverage ??= parseCoverage(page.html);
    for (const card of parseListing(page.html, page.url)) cards.set(card.url, card);
  }
  if (cards.size === 0) throw new Error('El listado no trajo planes: ¿cambió el HTML?');

  const items = [];
  const skipped = [];
  for (const card of cards.values()) {
    // Un error transitorio en cualquier detalle aborta la corrida: mejor no importar que importar incompleto.
    const page = await getPage(client, card.url);
    if (page.gone) { skipped.push({ name: card.name, url: card.url, reason: 'detalle 404/410' }); continue; }
    const plan = parsePlan(page.html, card.url, coverage);
    if (plan.skipped) skipped.push({ name: card.name, url: card.url, reason: plan.skipped });
    else items.push(plan);
  }
  // completa: items trae todo lo que la fuente ofrece hoy (el backend podrá desactivar lo que desaparezca).
  return { fuente: SOURCE, items, skipped, completa: true };
}
