import geography from '../data/colombia-locations.json' with { type: 'json' };

export const departments = geography.departments;
const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const locationKey = value => ['bogota', 'bogotadc'].includes(key(value)) ? 'bogota' : key(value);
export function findDepartment(value) { return departments.find(item => locationKey(item.name) === locationKey(value)); }
export function findCity(department, value) { return findDepartment(department)?.cities.find(city => locationKey(city.name) === locationKey(value)); }

// Repair only the editable draft. Old account data remains intact until the user saves.
export function coherentPreferences(value) {
  const department = findDepartment(value.department)?.name || '';
  const municipality = findCity(department, value.municipality)?.name || '';
  return { ...value, department: ['CITY', 'DEPARTMENT'].includes(value.mobility) ? department : '', municipality: value.mobility === 'CITY' ? municipality : '' };
}
export function changeLocation(value, field, next) {
  const updated = { ...value, [field]: next };
  if (field === 'department') updated.municipality = '';
  return coherentPreferences(updated);
}
export function validLocation(value) {
  if (value.mobility === 'CITY') return Boolean(findCity(value.department, value.municipality));
  if (value.mobility === 'DEPARTMENT') return Boolean(findDepartment(value.department));
  return ['ANY', 'RELOCATE'].includes(value.mobility);
}
