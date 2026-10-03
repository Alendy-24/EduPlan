import { comparisonGroups, comparisonHighlights, comparisonRowState } from '../utils/comparison';

export default function ComparisonSummary({ programs, priorities, loading }) {
  if (programs.length < 2) return null;
  const highlights = comparisonHighlights(programs, priorities);
  const rows = comparisonGroups.flatMap(group => group.rows.map(row => ({...row,...comparisonRowState(row,programs)})));
  const missing = rows.filter(row => row.values.some(value => !value));
  const differences = rows.filter(row => row.differs);
  return <section className="comparison-summary surface" aria-labelledby="comparison-summary-title">
    <div className="comparison-section-heading"><div><p className="eyebrow">Un vistazo antes de decidir</p><h2 id="comparison-summary-title">Las diferencias principales</h2></div><a className="text-link" href="#comparison-details-title">Ver comparación completa →</a></div>
    {loading ? <p role="status">Estamos actualizando los datos para preparar tu resumen…</p> : <>
      <p>{highlights.length ? 'Revisa qué cambia entre tus opciones. Tus prioridades aparecen primero.' : differences.length ? 'Las diferencias están en los datos de la institución. Revísalas en la comparación completa.' : 'No encontramos diferencias en los datos disponibles. Revisa los costos, los horarios y el plan de estudios antes de elegir.'}</p>
      {highlights.length > 0 && <div className="comparison-highlight-grid">{highlights.map(row => <article key={row.key}>
        <h3><a href={'#compare-'+row.groupId}>{row.label}</a>{row.priority && <span className="comparison-priority-label">Tu prioridad</span>}</h3>
        <dl>{programs.map((program,index) => <div key={program.id}><dt>Opción {String.fromCharCode(65+index)}</dt><dd>{row.values[index] || <span className="comparison-unknown">Por confirmar</span>}</dd></div>)}</dl>
      </article>)}</div>}
      {missing.length > 0 && <p className="comparison-summary-pending">Hay datos por confirmar: {missing.map(row=>row.label.toLocaleLowerCase('es')).join(', ')}. <a className="text-link" href="#compare-decisions">Consulta cada institución →</a></p>}
    </>}
  </section>;
}
