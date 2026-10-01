import {Link} from 'react-router-dom';

// Cards, dashboard, detail and comparison share the same evidence gate.
export default function RecommendationScore({result,className='compatibility'}) {
  const sufficient=result.evidence?.level==='SUFFICIENT';
  return <div className={className+(sufficient?'':' preliminary-match')}>
    {sufficient?<><strong>{result.score}%</strong><span>Coincidencia con tu perfil</span></>:<><strong>Coincidencia preliminar</strong><span>Aún tenemos pocas señales para mostrar un porcentaje útil.</span><Link className="text-link" to="/perfil?seccion=orientacion">Afina tus recomendaciones →</Link></>}
  </div>;
}
