import { Link } from 'react-router-dom';
import { useScholarshipRecommendations } from '../hooks/useScholarshipRecommendations';
import { scholarshipDate, scholarshipItem, scholarshipStatusLabel } from '../services/scholarships';
import ScholarshipBrand from './ScholarshipBrand';
import ScholarshipMatch from './ScholarshipMatch';
import BookmarkButton from './BookmarkButton';
import '../styles/scholarship-personalization.css';

export default function ScholarshipRecommendations() {
  const result = useScholarshipRecommendations();
  const loading = result.state === 'loading' || result.financingState === 'loading';
  return <section className="dashboard-section scholarship-recommendations" aria-labelledby="scholarship-recommendations-title">
    <div className="section-heading"><div><p className="eyebrow">Apoyo para tu siguiente paso</p><h2 id="scholarship-recommendations-title">Becas que podrían interesarte</h2><p>Oportunidades vigentes según tus respuestas, con requisitos que debes confirmar.</p></div><Link to="/becas?forYou=yes" className="text-link">Explorar más becas →</Link></div>
    {loading ? <p role="status">Preparando tus oportunidades de financiación…</p> : <>
      {result.error && <p role="alert">No pudimos consultar todas tus preferencias. Mostramos oportunidades disponibles. <button type="button" className="plain-button text-link" onClick={result.retry}>Reintentar</button></p>}
      {result.incomplete && <p className="scholarship-profile-prompt">Puedes explorar estas oportunidades aunque tu perfil esté incompleto. <Link to="/perfil#apoyo">Completa tus preferencias de apoyo</Link> para afinar la selección.</p>}
      {result.recommendations.length ? <div className="scholarship-recommendation-grid">{result.recommendations.slice(0, 3).map(row => <article className="scholarship-recommendation" key={row.item.id}>
        <div className="scholarship-recommendation-provider"><ScholarshipBrand item={row.item} /><span>{row.item.provider}</span></div><p className="scholarship-recommendation-state">{scholarshipStatusLabel(row.status)} · {row.item.type}</p><h3><Link to={scholarshipItem(row.item).href}>{row.item.name}</Link></h3><p className="scholarship-recommendation-coverage">{row.item.coverage}</p>
        <p className="scholarship-recommendation-date">{row.status === 'upcoming' ? 'Apertura: ' : row.item.deadline ? 'Cierre: ' : ''}{scholarshipDate(row.status === 'upcoming' ? row.item.opensAt : row.item.deadline)}</p>
        <ScholarshipMatch result={row} compact /><div className="scholarship-recommendation-actions"><Link to={scholarshipItem(row.item).href}>Ver información →</Link><BookmarkButton id={`opportunity-${row.item.id}`} label={row.item.name} item={scholarshipItem(row.item)} /></div>
      </article>)}</div> : <div className="scholarship-recommendation-empty"><p>No hay convocatorias verificadas que coincidan con tus condiciones actuales.</p><Link to="/perfil#apoyo">Revisar preferencias</Link> · <Link to="/becas">Explorar todo el catálogo</Link></div>}
    </>}
  </section>;
}
