export function validSavedItem(item) {
  return item && typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 200
    && typeof item.name === 'string' && typeof item.href === 'string'
    && item.href.startsWith('/') && !item.href.startsWith('//') && !item.href.includes('\\')
    && ['program','institution','opportunity'].includes(item.type)
    && (item.snapshot === undefined || item.snapshot === null || typeof item.snapshot === 'object' && !Array.isArray(item.snapshot) && Object.values(item.snapshot).every(value => typeof value === 'string'));
}
export function mergeRemoteSaved(remote, pending) {
  const map = new Map(remote.map(item => [item.id, item]));
  for (const operation of pending) {
    if (operation.action === 'delete') map.delete(operation.id);
    else if (validSavedItem(operation.item)) map.set(operation.id, operation.item);
  }
  return [...map.values()];
}
export const snapshotLabels = { name: 'Nombre', institution: 'Institución', city: 'Ciudad', level: 'Nivel', duration: 'Duración', modality: 'Modalidad', status: 'Estado', sector: 'Sector', academicCharacter: 'Carácter académico', website: 'Sitio web', provider: 'Entidad', type: 'Tipo de apoyo', deadline: 'Fecha de cierre', officialUrl: 'Fuente oficial' };
export function snapshotChanges(previous, current) {
  return Object.entries(snapshotLabels).filter(([key]) => typeof previous?.[key] === 'string' && previous[key] !== (current[key] || '')).map(([key,label]) => ({ key, label, before: previous[key], after: current[key] || 'No disponible' }));
}
