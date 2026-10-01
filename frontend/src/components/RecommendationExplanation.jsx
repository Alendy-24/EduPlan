import RecommendationScore from './RecommendationScore';
const criteria={affinity:'Afinidad académica / NBC',activities:'Actividades y contexto',modality:'Modalidad',location:'Ubicación',formation:'Tipo de formación',duration:'Duración',sector:'Sector institucional'};
export default function RecommendationExplanation({result,showScore=true}) {
  return <div className="recommendation-explanation">
    {showScore&&<RecommendationScore result={result}/>}
    <ul>{result.reasons.slice(0,3).map(reason=><li key={reason}>{reason}</li>)}</ul>
    <details><summary>¿Por qué me lo recomiendan?</summary><p>La coincidencia compara preferencias con datos publicados; no predice admisión, disfrute, costos ni empleabilidad. Las relaciones de actividades son editoriales, no mediciones de aptitud.</p>
      {result.evidence&&<p>{result.evidence.exactMatches} coincidencias completas de {result.evidence.criteriaAnswered} criterios respondidos. Las coincidencias parciales también aportan al orden.</p>}
      {result.breakdown?.length>0&&<ul className="match-breakdown">{result.breakdown.map(c=><li key={c.criterion}><strong>{criteria[c.criterion]||c.criterion}</strong><span>{c.state==='NOT_ANSWERED'?'Sin preferencia':c.state==='MISSING'?'Dato no disponible':Math.round(c.match*100)+'% dentro de este criterio'} · hasta {c.weight} puntos</span>{c.state!=='NOT_ANSWERED'&&<p>{c.detail}</p>}</li>)}</ul>}
      {!result.breakdown&&<p>Coincide: {result.matchedCriteria.map(v=>criteria[v]||v).join(' · ')}.</p>}
      {result.missingInformation.length>0&&<p>Datos faltantes: {result.missingInformation.join(' · ')}.</p>}
      <p>El máximo es 100 puntos entre todos los criterios; los no respondidos no redistribuyen sus puntos. Los resultados preliminares también se ordenan con estas señales.</p>
      <p className="subtle">Fuente: MEN / SNIES · Nombres consultados: {result.provenance?.nameImportedAt||'Fecha no disponible'} · Motor: {result.provenance?.algorithmVersion||'No disponible'}.</p>
    </details>
  </div>;
}
