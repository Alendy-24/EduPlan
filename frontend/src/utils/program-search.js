const fold = value => value.normalize('NFKD').replace(/\p{M}/gu, '').trim().toUpperCase();
const locationKey = value => {
  const key = fold(value).replace(/[^A-Z0-9]/g, '');
  const aliases = { BOGOTADC:'BOGOTA', SANTIAGODECALI:'CALI', CARTAGENADEINDIAS:'CARTAGENA', SANTIAGODETOLU:'TOLU', SANJOSEDECUCUTA:'CUCUTA', ARCHIPIELAGODESANANDRESPROVIDENCIAYSANTACATALINA:'SANANDRESYPROVIDENCIA' };
  return aliases[key] || key;
};
export function facetCount(facets, key, value) {
  if (!facets?.[key]) return undefined;
  const normalize = ['department','municipality'].includes(key) ? locationKey : fold;
  return facets[key].find(entry => normalize(entry.value) === normalize(value))?.count ?? 0;
}
export function offerIsSelected(left, right) {
  return left.id === right.id || Boolean(left.offerId && left.offerId === right.offerId) || left.groupedSourceIds?.includes(right.sourceId || right.id)
    || right.groupedSourceIds?.includes(left.sourceId || left.id) || false;
}
export const relaxationLabels = {
  municipality: 'Buscar en todo el departamento', department: 'Buscar en toda Colombia',
  modality: 'Ver todas las modalidades', institutionCode: 'Ver otras universidades',
  knowledgeArea: 'Ver todas las áreas', academicLevel: 'Ver todos los niveles',
};
export const filterParams = { municipality:'city', department:'department', modality:'modality', institutionCode:'institution', knowledgeArea:'area', academicLevel:'level' };
