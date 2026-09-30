import { Link } from 'react-router-dom';
import { useRecommendations } from '../hooks/useRecommendations';
import ProgramCard from './ProgramCard';
import RecommendationExplanation from './RecommendationExplanation';
import { useRecommendationFeedback } from '../hooks/useRecommendationFeedback';
export default function RecommendationsSection({ limit=20 }) {
  const feedback = useRecommendationFeedback();
  const result = useRecommendations({limit,excludedSourceIds:feedback.excluded});
  return <section className="dashboard-section recommendations-section"><h2>Recomendados para ti</h2><p className="subtle">Compatibilidad con tus preferencias actuales, no una sentencia vocacional. Se consideran ofertas activas con nombre académico verificado.</p>
    {feedback.excluded.length>0 && <p className="subtle">{feedback.excluded.length} registros ocultos para tu cuenta en este dispositivo. <button className="plain-button text-link" onClick={feedback.reset}>Restaurar recomendaciones ocultas</button></p>}{!feedback.persistent && <p role="status">No pudimos guardar las exclusiones en este dispositivo; permanecen durante esta visita.</p>}
    {result.state==='loading' ? <p role="status">Consultando el catálogo y calculando compatibilidad…</p> : result.state==='error' ? <div role="alert"><p>{result.error}</p><button className="btn btn-secondary" onClick={result.retry}>Reintentar recomendaciones</button></div> : result.status==='INCOMPLETE_PROFILE' ? <div className="notice"><p>Completa tu perfil para recibir recomendaciones: elige al menos un interés y el nivel buscado. Si restringes la ubicación, indica ciudad o departamento.</p><Link className="btn btn-primary" to="/perfil">Completar mi perfil</Link></div> : result.data.length ? <div className="recommendation-list">{result.data.map(row=><div className="recommendation-result" key={row.program.sourceId}><ProgramCard program={row.program}><RecommendationExplanation result={row} /></ProgramCard><button className="plain-button text-link recommendation-dismiss" aria-label={`No me interesa ${row.program.name}`} onClick={()=>feedback.dismiss(row.program.sourceId)}>No me interesa</button></div>)}</div> : <div className="notice"><p>No hay ofertas verificadas que cumplan tus restricciones actuales. Revisa nivel y disposición geográfica; no hemos sustituido tus preferencias.</p><Link className="btn btn-secondary" to="/perfil">Revisar preferencias</Link></div>}
    {limit===3 && <p><Link className="text-link" to="/recomendaciones">Ver todas mis recomendaciones →</Link></p>}
  </section>;
}
