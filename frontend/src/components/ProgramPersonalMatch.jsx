import { useAuth } from '../contexts/AuthContext';
import { useRecommendations } from '../hooks/useRecommendations';
import RecommendationExplanation from './RecommendationExplanation';
import { Link } from 'react-router-dom';
export default function ProgramPersonalMatch({ sourceIds,comparison=false }) {
  const { user } = useAuth(), result = useRecommendations({sourceIds});
  if (!user || !sourceIds.length) return null;
  return <section className="personal-match"><h2>{comparison ? 'Compatibilidad personal' : 'Por qué puede interesarte'}</h2>
    {result.state==='loading' ? <p role="status">Calculando compatibilidad con tus preferencias…</p> : result.state==='error' ? <><p role="status">{result.error}</p><button className="btn btn-secondary" onClick={result.retry}>Reintentar compatibilidad</button></> : result.status==='INCOMPLETE_PROFILE' ? <p><Link to="/perfil">Completa tu perfil</Link> para calcular compatibilidad.</p> : result.data.length ? <div className={comparison ? 'comparison-personal' : ''}>{result.data.map(row=><section key={row.program.sourceId}>{comparison && <h3>{row.program.name}</h3>}<RecommendationExplanation result={row} /></section>)}</div> : <p>No hay puntuación calculable: el registro no cumple tus restricciones o no tiene la calidad mínima necesaria. Esto no equivale a 0% de compatibilidad.</p>}
    {comparison && result.state==='ready' && result.data.length>0 && result.data.length<sourceIds.length && <p className="subtle">Algunas opciones no tienen puntuación: sus datos o restricciones no permiten calcularla.</p>}
  </section>;
}
