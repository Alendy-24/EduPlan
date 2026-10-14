// Exact names of the same Colombian municipality used by the two official
// catalogs. Do not use fuzzy matching or turn department names into cities.
export function municipalityKey(value: string): string {
  const key=value.normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const aliases: Record<string,string> = {
    BOGOTADC:'BOGOTA', SANTIAGODECALI:'CALI', CARTAGENADEINDIAS:'CARTAGENA',
    SANJOSEDECUCUTA:'CUCUTA', SANTIAGODETOLU:'TOLU',
  };
  return aliases[key] ?? key;
}
