import { Link } from 'react-router-dom';
import BookmarkButton from './BookmarkButton';
import CompareButton from './CompareButton';
import { programHref, programItem } from '../utils/programs';
export default function ProgramCard({ program }) {
  return <article className={`list-item surface${program.image ? '' : ' program-no-image'}`}>
    {program.image && <img src={program.image} alt="Espacio de estudio de referencia" loading="lazy" />}
    <div><h3>{program.name}</h3><p>{program.institution}</p><div className="metadata"><span>{program.level}</span><span>{program.city}</span><span>{program.duration}</span><span>{program.modality || 'Modalidad no disponible'}</span></div>
    <p className="program-status">{program.provenance === 'demo' ? 'Demostración' : `Estado publicado: ${program.status || 'No disponible'}`}</p>
    {program.reviewRequired && <small className="provenance-note">{program.nameOrigin === 'AWARDED_TITLE' ? 'Se muestra el título otorgado; nombre del programa pendiente de revisión.' : 'Nombre del programa pendiente de verificación.'}</small>}</div>
    <div className="list-actions"><BookmarkButton id={`program-${program.id}`} label={program.name} item={programItem(program)} /><CompareButton program={program} /><Link className="btn btn-primary" to={programHref(program)}>Ver programa</Link></div>
  </article>;
}
