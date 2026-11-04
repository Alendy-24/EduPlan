export function campusDescription(institution) {
  return [institution.municipality, institution.department && institution.department !== institution.municipality ? institution.department : '', institution.campus === 'Principal' ? 'Sede principal' : institution.campus, institution.code ? 'Código ' + institution.code : ''].filter(Boolean).join(' · ');
}
export function institutionLabel(institution) {
  return institution.name + (institution.code ? ' — ' + campusDescription(institution) : '');
}

// Every option includes the published city and campus, without internal codes.
export function institutionSearchOptions(institutions) {
  return institutions.map(institution => {
    const city = institution.municipality?.trim() || 'Ciudad por confirmar';
    const campus = institution.campus?.trim();
    const campusLabel = campus === 'Principal' ? 'Sede principal' : campus === 'Seccional' ? 'Sede seccional' : campus ? 'Sede ' + campus : 'Sede por confirmar';
    const detail = city + ' · ' + campusLabel;
    return { ...institution, detail, label:institution.name + ' — ' + detail };
  });
}
