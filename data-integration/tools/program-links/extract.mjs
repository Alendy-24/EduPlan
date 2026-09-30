import { load } from 'cheerio';

export const fold = value => (value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clean = value => value.replace(/\s+/g, ' ').trim();
export function extractPage(html, url) {
  const $ = load(html); $('script,style,nav,footer,form,[role="banner"]').remove();
  const text = clean($('body').text());
  const headings = $('h1,h2').map((_, element) => clean($(element).text())).get().filter(Boolean);
  const primaryHeadings = $('h1').map((_, element) => clean($(element).text())).get().filter(Boolean);
  const title = clean($('title').text());
  const canonical = $('link[rel="canonical"]').attr('href');
  const labels = {};
  $('dt,th,strong,b,label,span,p,h3,h4').each((_, element) => {
    const node = $(element), key = fold(node.text());
    if (key.length > 70) return;
    const next = node.next().text() || node.parent().next().text() || node.parent().text().replace(node.text(), '');
    if (next && next.length < 250) { labels[key] ||= new Set(); labels[key].add(clean(next)); }
  });
  const label = pattern => { const values = new Set(Object.entries(labels).filter(([key]) => pattern.test(key)).flatMap(([,values]) => [...values])); return values.size === 1 ? [...values][0] : ''; };
  // Uniandes publishes explicit level/modality chips in the program header.
  // Restrict the adapter to that container: footer/navigation text is never evidence.
  const headerFacts = $('[class*="header-program"]').first().find('span').map((_, element) => clean($(element).text())).get();
  const headerFact = values => [...new Set(headerFacts.filter(value => values.includes(value)))];
  const levels = headerFact(['Pregrado','Posgrado']);
  const modalities = headerFact(['Presencial','Virtual','A distancia']);
  const degrees = headerFact(['Doctorado','Maestría','Especialización','Universitario','Tecnológico','Técnico profesional']);
  const educationLevel = label(/^(nivel de formacion)$/) || (degrees.length === 1 ? degrees[0] : '');
  const academicByDegree = { doctorado:'Posgrado',maestria:'Posgrado',especializacion:'Posgrado',universitario:'Pregrado',tecnologico:'Pregrado','tecnico profesional':'Pregrado' };
  const snies = [...new Set([...text.matchAll(/(?:c[oó]digo\s*(?:de\s*)?)SNIES\s*(?:del?\s*programa)?\s*[:#-]?\s*(\d{3,8})/gi)].map(match => match[1]))];
  return { url: canonical ? new URL(canonical, url).href : url, title, headings, primaryHeadings, text: text.slice(0, 100000), snies,
    awardedTitle: label(/^(titulo otorgado|titulo que otorga|titulo a obtener)$/),
    level: label(/^(nivel academico|nivel)$/) || (levels.length === 1 ? levels[0] : academicByDegree[fold(educationLevel)] || ''), educationLevel, city: label(/^(sede|ciudad|lugar de desarrollo|lugar donde se oferta)$/),
    modality: label(/^(modalidad|metodologia)$/) || (modalities.length === 1 ? modalities[0] : ''), dynamic: /cargando\s+(snies|titulo|nivel|modalidad|nombre)/i.test(text),
    links: $('a[href]').map((_, element) => { try { return new URL($(element).attr('href'), url).href; } catch { return ''; } }).get().filter(Boolean) };
}
export function sitemapLinks(xml) {
  const $ = load(xml, { xmlMode: true });
  return { indexes: $('sitemap > loc').map((_, el) => $(el).text().trim()).get(), pages: $('url > loc').map((_, el) => $(el).text().trim()).get() };
}
export const programPath = value => {
  const path=new URL(value).pathname;
  return !/\/(noticias?|news|eventos?|blog|actualidad|comunicados)\//i.test(path) && /program|pregrado|posgrado|carrera|maestr|doctor|especializ|oferta.academ|ingenier|facultad/i.test(path);
};
export const discoveryPriority = value => /\/(programas?|carreras?|pregrado|posgrado)\/[^/]+\/?$|\/carrera-[^/]+\/?$/i.test(new URL(value).pathname) ? 0 : 1;

// Source codes are intentionally NEVER compared with SNIES extracted from a page.
export function matchPage(page, programs, contrastedSnies = {}) {
  const headings = (page.primaryHeadings || []).map(fold);
  const title = fold(page.awardedTitle);
  const exact = programs.filter(program => headings.includes(fold(program.name)) || title && title === fold(program.awardedTitle));
  // A university can offer the same title in different campuses/modalities.
  // Uniqueness concerns the published identity tuple, not the title alone.
  const matchesContext = program => Boolean(page.level && page.city && page.modality)
    && [[page.level,program.academicLevel],[page.city,program.municipality],[page.modality,program.modality]].every(([a,b])=>fold(a)===fold(b))
    && (!page.educationLevel || !program.educationLevel || fold(page.educationLevel)===fold(program.educationLevel));
  const exactContext = exact.filter(matchesContext);
  const decisions = [];
  for (const program of programs) {
    const name = fold(program.name), awarded = fold(program.awardedTitle);
    const evidence = { pageTitle: page.title.slice(0, 500), headings: page.headings.slice(0, 8), primaryHeadings:page.primaryHeadings, awardedTitle: page.awardedTitle, snies: page.snies,
      level: page.level, educationLevel:page.educationLevel, city: page.city, modality: page.modality, dynamic: page.dynamic };
    evidence.matchedNames = [program.name, program.awardedTitle].filter(Boolean);
    const conflicts = [ [page.level, program.academicLevel], [page.educationLevel,program.educationLevel], [page.city, program.municipality], [page.modality, program.modality] ].some(([a,b]) => a && b && fold(a) !== fold(b));
    const snies = contrastedSnies[program.sourceId];
    const sniesPeers = snies ? programs.filter(item => contrastedSnies[item.sourceId] === snies) : [];
    const fullContext = page.level && page.city && page.modality && [[page.level,program.academicLevel],[page.city,program.municipality],[page.modality,program.modality]].every(([a,b]) => fold(a) === fold(b));
    const identifiedSnies = Boolean(snies && page.snies.length === 1 && page.snies[0] === snies && (sniesPeers.length === 1 || fullContext));
    const exactIdentity = exactContext.length === 1 && exactContext[0].sourceId === program.sourceId;
    const discover = value => fold(value).replace(/\b(ingeniero|ingeniera)\b/g, 'ingenieria').replace(/\badministrador\b/g, 'administracion').replace(/\b(a|de|del|en|la|el|y|los|las|titulo|otorgado|pregrado|posgrado)\b/g, '').replace(/\s+/g, ' ').trim();
    const pageTerms = discover(`${page.title} ${page.headings.join(' ')} ${page.awardedTitle}`).split(' ');
    const similar = [name, awarded].filter(Boolean).some(term => {
      if (fold(`${page.title} ${page.headings.join(' ')} ${page.awardedTitle}`).includes(term)) return true;
      const words = discover(term).split(' ').filter(Boolean);
      return words.length >= 2 && words.filter(word => pageTerms.includes(word)).length / words.length >= 0.8;
    });
    if (!similar && !identifiedSnies) continue;
    decisions.push({ sourceId: program.sourceId, institutionCode: program.institutionCode, url: page.url,
      status: !page.dynamic && !conflicts && (identifiedSnies || exactIdentity) ? 'VERIFIED' : 'PENDING',
      evidence: { ...evidence, reason: conflicts ? 'Contradicción en sede, nivel o modalidad' : identifiedSnies ? 'SNIES contrastado' : exactIdentity ? 'Identidad completa y única' : 'Requiere revisión de identidad' } });
  }
  return decisions;
}
