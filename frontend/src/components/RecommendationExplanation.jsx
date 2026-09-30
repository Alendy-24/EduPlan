const criteria = { interests:'Intereses académicos (NBC)',modality:'Modalidad',location:'Ubicación',academicLevel:'Nivel académico' };
export default function RecommendationExplanation({ result, showScore = true }) {
  return <div className="recommendation-explanation">{showScore && <p className="compatibility"><strong>{result.score}%</strong> de compatibilidad con tus preferencias actuales</p>}<ul>{result.reasons.slice(0,3).map(reason=><li key={reason}>{reason}</li>)}</ul>
    <details><summary>¿Por qué me lo recomiendan?</summary><p>La puntuación compara tus preferencias con el catálogo; no predice admisión, disfrute, costos ni empleabilidad.</p><p>Coincide: {result.matchedCriteria.map(v=>criteria[v]||v).join(' · ')}.</p>{result.unmatchedCriteria.length>0 && <p>No coincide: {result.unmatchedCriteria.map(v=>criteria[v]||v).join(' · ')}.</p>}{result.missingInformation.length>0 && <p>Datos faltantes: {result.missingInformation.join(' · ')}.</p>}<p className="subtle">Fuente: MEN / SNIES · Nombres consultados: {result.provenance?.nameImportedAt || 'Fecha no disponible'} · Motor: {result.provenance?.algorithmVersion || 'No disponible'}.</p></details>
  </div>;
}
