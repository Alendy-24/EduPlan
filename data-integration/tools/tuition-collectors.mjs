import { load } from 'cheerio';
import { createHash } from 'node:crypto';
export const fold = s => s.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Deliberately limited to a verified university template. Never scan the entire
// page for a currency amount: that could select English courses or discounts.
export function extractUnabTuition(html, source, names, checkedAt) {
  if (new URL(source).origin !== 'https://unab.edu.co' || !new URL(source).pathname.startsWith('/programas/')) return {reason:'UNTRUSTED_SOURCE'};
  const $ = load(html);
  $('script, style, nav, footer').remove();
  const codes = new Set();
  $('li').each((_, el) => {
    const match=$(el).text().trim().match(/^Registro\s+Snies\s*[–—:-]\s*(\d+)\s*$/i);
    if(match) codes.add(match[1]);
  });
  if(codes.size !== 1) return {reason:'AMBIGUOUS_SNIES'};
  const code=[...codes][0];
  const offers=names.filter(n=>n[0]===code && n[1]==='1823');
  if(offers.length!==1) return {reason:'AMBIGUOUS_OFFER'};
  const n=offers[0];
  const modalityHeaders=$('.et_pb_module_header').filter((_,el)=>fold($(el).text())==='MODALIDAD');
  if(modalityHeaders.length!==1 || fold(modalityHeaders.first().siblings('.et_pb_blurb_description').text())!==fold(n[5])) return {reason:'MODALITY_MISMATCH'};
  const headers=$('.et_pb_module_header').filter((_,el)=>fold($(el).text())==='VALORPRIMERINGRESO');
  if(headers.length!==1) return {reason:'MISSING_FIRST_ENROLLMENT_PRICE'};
  const description=headers.first().siblings('.et_pb_blurb_description');
  const priceLines=description.children('h4');
  if(priceLines.length!==1) return {reason:'AMBIGUOUS_PRICE_BLOCK'};
  const text=priceLines.text().replace(/\s+/g,' ').trim();
  if(/\b(desde|hasta|aproximad\w*|estimad\w*|descuento\w*|beca\w*)\b|cr[eé]dito/i.test(text)) return {reason:'CONDITIONAL_OR_NON_TUITION_PRICE'};
  const prices=[...text.matchAll(/\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?![\d.,])/g)];
  const years=[...text.matchAll(/vigencia\s+(20\d{2})/gi)];
  if(prices.length!==1 || years.length!==1 || !/matr[ií]cula.*primer ingreso/i.test(text)) return {reason:'UNCONFIRMED_PRICE_OR_YEAR'};
  const year=Number(years[0][1]);
  if(year!==Number(checkedAt.slice(0,4))) return {reason:'OUTDATED_PRICE'};
  const amount=Number(prices[0][1].replaceAll('.',''));
  if(!Number.isSafeInteger(amount)||amount<0) return {reason:'INVALID_AMOUNT'};
  // The SNIES code is printed on the same program page and uniquely identifies
  // the modality/campus in the independent official index; no name inference.
  return {record:{sniesCode:code,institutionCode:n[1],programName:n[2],modality:n[5],municipality:n[6],
    amount,source,checkedAt,priceYear:year,billingPeriod:'FIRST_ENROLLMENT',
    note:text + '. Confirma el periodo de cobro y los derechos adicionales con la institución.',
    evidence:text,contentSha256:createHash('sha256').update(html).digest('hex'),collector:'UNAB_FIRST_ENROLLMENT_V1'}};
}

export function discoverProgramUrls(xml) {
  const $=load(xml,{xml:true});
  return [...new Set($('url > loc').map((_,el)=>$(el).text().trim()).get().filter(value=>{
    try {const url=new URL(value);return url.origin==='https://unab.edu.co' && /^\/programas\/[^/]+\/$/.test(url.pathname)&&!url.search;}catch{return false;}
  }))].sort();
}

export function mergeCollectedPrices(current, incoming) {
  const key=r=>JSON.stringify([r.sniesCode,r.institutionCode,fold(r.modality),fold(r.municipality),r.priceYear]);
  const grouped=new Map();
  for(const r of incoming){const id=key(r);const rows=grouped.get(id)||[];rows.push(r);grouped.set(id,rows);}
  const result=new Map(), conflicts=[], blocked=new Set();
  for(const r of current){const id=key(r);if(result.has(id)||blocked.has(id)){result.delete(id);blocked.add(id);}else result.set(id,r);}
  conflicts.push(...blocked);
  for(const [id,rows] of grouped){
    if(blocked.has(id))continue;
    if(new Set(rows.map(r=>JSON.stringify([r.amount,r.billingPeriod]))).size!==1){conflicts.push(id);result.delete(id);continue;}
    const r=rows.sort((a,b)=>a.source.localeCompare(b.source))[0];
    const old=result.get(id);
    // A newly conflicting amount is a candidate for review, never an automatic update.
    if(old && (old.amount!==r.amount || old.billingPeriod!==r.billingPeriod)){conflicts.push(id);result.delete(id);continue;}
    if(!old || old.checkedAt<=r.checkedAt)result.set(id,r);
  }
  return {records:[...result.values()],conflicts};
}
