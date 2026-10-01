import { Link } from 'react-router-dom';
import { useRecommendations } from '../../hooks/useRecommendations';
import { academicProgramName, programHref, programItem } from '../../utils/programs';
import BookmarkButton from '../BookmarkButton';
import ProfileIcon from './ProfileIcon';
export default function ProfileRecommendationsPreview({ dirty }) {
  const result = useRecommendations({ limit: 2 });
  return <section className="profile-preview" aria-labelledby="preview-title"><h2 id="preview-title">Una primera mirada a tus opciones</h2><p>{dirty ? 'Esta selección corresponde a tu perfil guardado.' : 'Programas que puedes explorar con tu información actual.'}</p>
    {result.state === 'loading' ? <p role="status">Buscando opciones para ti…</p> : result.state === 'error' ? <><p>No pudimos cargar tus opciones ahora.</p><button className="text-link plain-button" type="button" onClick={result.retry}>Volver a intentar</button></> : result.status === 'INCOMPLETE_PROFILE' ? <div className="preview-empty"><ProfileIcon name="academic"/><p>Completa tu nivel, tus intereses y la ubicación que elijas para ver tus opciones.</p></div> : result.data.length ? <div className="preview-programs">{result.data.map(({ program }) => <article key={program.sourceId} className="preview-program"><div className="preview-program-top"><span>{program.level}</span><BookmarkButton iconOnly id={`program-${program.id}`} label={academicProgramName(program)} item={programItem(program)}/></div><h3>{academicProgramName(program)}</h3><p>{program.institution}</p><small><ProfileIcon name="location"/>{program.city}</small><small><ProfileIcon name="study"/>{program.modality}</small>{programHref(program) && <Link to={programHref(program)}>Ver programa <ProfileIcon name="arrow"/></Link>}</article>)}</div> : <p>No hay coincidencias con tu selección actual. Puedes ampliar la ubicación.</p>}
    <Link className="preview-all" to="/recomendaciones">Explorar mis recomendaciones <ProfileIcon name="arrow"/></Link>
  </section>;
}
