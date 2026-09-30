export function campusDescription(institution) {
  return [institution.municipality, institution.department && institution.department !== institution.municipality ? institution.department : '', institution.campus === 'Principal' ? 'Sede principal' : institution.campus, institution.code ? 'Código ' + institution.code : ''].filter(Boolean).join(' · ');
}
export function institutionLabel(institution) {
  return institution.name + (institution.code ? ' — ' + campusDescription(institution) : '');
}
