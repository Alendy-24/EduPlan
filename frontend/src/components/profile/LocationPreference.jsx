import { departments, findDepartment } from '../../utils/profile-location';
import ProfileIcon from './ProfileIcon';
export default function LocationPreference({ value, onChange }) {
  const options = [['CITY', 'Mi ciudad'], ['DEPARTMENT', 'Mi departamento'], ['ANY', 'Todo Colombia']];
  if (value.mobility === 'RELOCATE') options.push(['RELOCATE', 'Todo Colombia · puedo mudarme']);
  const local = ['CITY', 'DEPARTMENT'].includes(value.mobility);
  return <>
    <label className="academic-field" htmlFor="pref-mobility">Cobertura geográfica
      <span className="profile-input"><ProfileIcon name="location"/><select id="pref-mobility" name="mobility" value={value.mobility} onChange={event => onChange('mobility', event.target.value)} aria-describedby="location-help"><option value="">Elige dónde buscar</option>{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></span>
    </label>
    <p className="field-help" id="location-help">{value.mobility === 'CITY' ? 'Verás programas ofrecidos en la ciudad que elijas.' : value.mobility === 'DEPARTMENT' ? 'Buscaremos programas en todo el departamento.' : 'Explora oportunidades en el lugar donde te gustaría estudiar.'}</p>
    {local && <div className="academic-location-fields">
      <div className="academic-field"><label htmlFor="pref-department">Departamento</label><select id="pref-department" name="department" value={value.department} required onChange={event => onChange('department', event.target.value)}><option value="">Elige un departamento</option>{departments.map(item => <option key={item.code} value={item.name}>{item.name}</option>)}</select></div>
      {value.mobility === 'CITY' && <div className="academic-field"><label htmlFor="pref-city">Ciudad o municipio</label><select id="pref-city" name="municipality" value={value.municipality} disabled={!value.department} required onChange={event => onChange('municipality', event.target.value)}><option value="">{value.department ? 'Elige una ciudad' : 'Primero elige departamento'}</option>{findDepartment(value.department)?.cities.map(city => <option key={city.code} value={city.name}>{city.name}</option>)}</select></div>}
    </div>}
  </>;
}
