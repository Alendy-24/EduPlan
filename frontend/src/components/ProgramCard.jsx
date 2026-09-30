import { Link } from 'react-router-dom';
import BookmarkButton from './BookmarkButton';
import CompareButton from './CompareButton';
import { programHref, programItem, programSearchMatches } from '../utils/programs';
export default function ProgramCard({ program, searchQuery = '' }) {
  const href = programHref(program);
  const searchMatches = programSearchMatches(program, searchQuery);
  const matches = searchMatches.filter(match => match.key !== 'area' && match.value !== program.name);
  return <article className={`list-item surface${program.image ? '' : ' program-no-image'}`}>
    {program.image && <img src={program.image} alt="Espacio de estudio de referencia" loading="lazy" />}
    <div>{program.nameOrigin === 'AWARDED_TITLE' && <small className="subtle">Nombre del programa sin confirmar · título otorgado</small>}<h3>{program.name}</h3>{program.nameOrigin === 'OFFICIAL_PAGE' && <><p className="program-match">Título otorgado: {program.awardedTitle || 'No disponible en el catálogo'}</p><small className="subtle">Nombre confirmado en la página oficial</small></>}<p>{program.institution}</p><div className="metadata"><span>{program.level}</span><span>{program.city}</span><span>{program.duration}</span><span>{program.modality || 'Modalidad no disponible'}</span></div>
    <p className="program-status">{program.provenance === 'demo' ? 'Demostración' : `Estado publicado: ${program.status || 'No disponible'}`}</p>
    {program.area && <p className="program-area">Área publicada: {program.area}</p>}
    {searchQuery.trim() && program.searchMatch === 'KNOWLEDGE_AREA' && !searchMatches.some(match=>match.key==='name') && <p className="program-match">Coincidencia solo por área de conocimiento.</p>}
    {matches.map(match => <p className="program-match" key={match.key}>{match.label}: {match.value}</p>)}</div>
    <div className="list-actions"><BookmarkButton id={`program-${program.id}`} label={program.name} item={programItem(program)} /><CompareButton program={program} />{href ? <Link className="btn btn-primary" to={href}>Ver programa</Link> : <span className="subtle">Detalle no disponible: falta el código publicado.</span>}</div>
  </article>;
}
