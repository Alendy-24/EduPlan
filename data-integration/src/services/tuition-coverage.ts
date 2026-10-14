import type { Program } from '../models/program.js';
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function tuitionCoverage(programs: Program[], year = new Date().getUTCFullYear()) {
  // Distinct geographic offerings, including unresolved identities in denominator.
  const offers = new Map<string, Program>();
  for (const p of programs) {
    if (fold(p.status) !== 'ACTIVO') continue;
    const key = p.sniesCode ? JSON.stringify([p.institutionCode,p.sniesCode,fold(p.modality),fold(p.municipality)]) : p.sourceId;
    const old=offers.get(key);
    if (!old || !old.tuition) offers.set(key,p);
  }
  const institutions = new Map<string,{ institutionCode:string; institutionName:string; activeOffers:number; reportedPrices:number; currentInstitutionalPrices:number; missing:number; unresolved:number }>();
  const missing: {sourceId:string; institutionCode:string; name:string; municipality:string; reason:string}[]=[];
  for (const p of offers.values()) {
    const row=institutions.get(p.institutionCode) ?? {institutionCode:p.institutionCode,institutionName:p.institutionName,activeOffers:0,reportedPrices:0,currentInstitutionalPrices:0,missing:0,unresolved:0};
    row.activeOffers++;
    if (!p.sniesCode) row.unresolved++;
    const t=p.tuition;
    const usable=t && Number.isFinite(t.amount) && t.amount >= 0 && t.currency==='COP'
      && (t.basis==='NEW_STUDENT_REPORTED' || t.basis==='INSTITUTION_PUBLISHED' && t.priceYear===year);
    if (usable) {row.reportedPrices++;if(t.basis==='INSTITUTION_PUBLISHED')row.currentInstitutionalPrices++;}
    else {row.missing++;missing.push({sourceId:p.sourceId,institutionCode:p.institutionCode,name:p.name,municipality:p.municipality,reason:p.sniesCode?'NO_VERIFIED_AMOUNT':'UNRESOLVED_IDENTITY'});}
    institutions.set(p.institutionCode,row);
  }
  const rows=[...institutions.values()].sort((a,b)=>b.missing-a.missing||a.institutionCode.localeCompare(b.institutionCode));
  const reportedPrices=rows.reduce((s,r)=>s+r.reportedPrices,0), currentInstitutionalPrices=rows.reduce((s,r)=>s+r.currentInstitutionalPrices,0);
  return {year,activeOffers:offers.size,reportedPrices,currentInstitutionalPrices,
    reportedCoveragePercent:offers.size ? reportedPrices/offers.size*100 : null,
    confirmedCurrentCoveragePercent:offers.size ? currentInstitutionalPrices/offers.size*100 : null,
    institutions:rows,missing,
    note:'SNIES reports an amount without confirming its year or billing period. Only current institutional schedules count as confirmed-current coverage.'};
}
