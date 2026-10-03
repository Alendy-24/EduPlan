import { Link } from 'react-router-dom';
import BookmarkButton from './BookmarkButton';
import CompareButton from './CompareButton';
import { academicProgramName, programHref, programItem, programSearchMatches } from '../utils/programs';
export default function ProgramCard({ program, searchQuery = '', children }) {
  const href = programHref(program);
  const name = academicProgramName(program);
  const matches = programSearchMatches(program, searchQuery);
  return <article className={'list-item surface program-card' + (program.image ? '' : ' program-no-image')}>
    {program.image && <img src={program.image} alt="Espacio de estudio de referencia" loading="lazy" />}
    <div><h3>{name}</h3><p className="program-institution">{program.institution}</p>
      <div className="metadata program-key-details">{[program.city, program.modality, program.level].filter(Boolean).map((text, i) => <span key={i}>{text}</span>)}</div>
      {program.institutionCampus && <p className="program-campus">Sede: {program.institutionCampus}</p>}
      {program.duration && <p className="program-duration">Duración publicada: {program.duration}</p>}
      {program.status && <p className="program-status">Estado: {program.status}</p>}
      {program.provenance === 'demo' && <p className="program-status">Demostración</p>}
      <details className="program-card-details"><summary>Información académica</summary>
        {program.educationLevel && <p>Formación: {program.educationLevel}</p>}
        {program.area && <p className="program-area">Área de conocimiento: {program.area}</p>}
        <p className="program-title"><span>Título otorgado:</span> {program.awardedTitle || 'No disponible'}</p>
      </details>
      {program.searchMatch === 'SPELLING_VARIANT' && <p className="program-match">Nombre similar a lo que escribiste.</p>}
      {children}
      {searchQuery.trim() && program.searchMatch === 'KNOWLEDGE_AREA' && !matches.some(match => match.key === 'name') && <p className="program-match">Coincidencia por área de conocimiento.</p>}
    </div>
    <div className="list-actions"><BookmarkButton id={'program-' + program.id} label={name} item={programItem({ ...program, name })} /><CompareButton program={{ ...program, name }} />{href ? <Link className="btn btn-primary" to={href}>Ver programa</Link> : <span className="subtle">Detalle no disponible: falta el código publicado.</span>}</div>
  </article>;
}
