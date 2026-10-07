import { Link } from 'react-router-dom';
import { useExploration } from '../contexts/ExplorationContext';

export default function ProgramComparisonBar() {
  const { comparison, toggleCompare, clearComparison } = useExploration();
  if (!comparison.length) return null;
  return <aside className="program-comparison-bar surface" aria-label="Programas seleccionados para comparar">
    <div className="program-comparison-heading"><strong role="status">{comparison.length} de 3 programas seleccionados</strong>
      <Link to="/comparar" className="btn btn-primary" aria-label={comparison.length > 1 ? `Comparar ${comparison.length} programas` : 'Ver selección'}>{comparison.length > 1 ? <>Comparar<span className="comparison-detail-label"> {comparison.length} programas</span></> : 'Ver selección'}</Link></div>
    <details className="program-comparison-selection"><summary>Ver o editar selección</summary>
      <ul>{comparison.map(program => <li key={program.id}><div><strong>{program.name}</strong><small>{program.institution} · {program.city}</small></div>
        <button type="button" className="plain-button" aria-label={`Quitar ${program.name} de comparación`} onClick={() => toggleCompare(program)}>Quitar</button></li>)}</ul>
      <div className="program-comparison-actions"><span>{comparison.length === 1 ? 'Añade otra opción para comparar.' : comparison.length === 3 ? 'Puedes quitar una opción para elegir otra.' : 'Puedes añadir una opción más.'}</span>
        <button type="button" className="btn btn-secondary" onClick={clearComparison}>Limpiar comparación</button></div>
    </details>
  </aside>;
}
