export default function ScholarshipMatch({ result, compact = false }) {
  if (!result) return null;
  return <div className={`scholarship-match scholarship-match-${result.classification}`}>
    <strong>{result.label}</strong><p>{result.explanation}</p>
    {compact ? <p className="scholarship-match-condition">{result.incompatibilities[0] || result.preferenceConflicts[0] || result.pending[0] || 'La coincidencia orienta tu búsqueda; la entidad valida todos los requisitos.'}</p> : <>
      {result.matches.length > 2 && <ul>{result.matches.slice(2).map(match => <li key={match.criterion}>{match.text}</li>)}</ul>}
      {result.incompatibilities.length > 0 && <div><h3>Requisito incompatible con tu respuesta</h3><ul>{result.incompatibilities.map(text => <li key={text}>{text}</li>)}</ul></div>}
      {result.preferenceConflicts.length > 0 && <div><h3>Diferencias con lo que buscas</h3><ul>{result.preferenceConflicts.map(text => <li key={text}>{text}</li>)}</ul></div>}
      {result.pending.length > 0 && <div><h3>Por comprobar con la entidad</h3><ul>{result.pending.map(text => <li key={text}>{text}</li>)}</ul></div>}
      <p className="scholarship-match-condition">Afinidad con tu perfil no equivale a elegibilidad confirmada. No se comparan notas, ingresos ni documentos personales.</p>
    </>}
  </div>;
}
