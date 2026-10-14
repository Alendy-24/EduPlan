import { Link } from 'react-router-dom';
import { officialCostSource, publishedAdditionalCosts } from '../utils/program-costs';
import { tuitionChartRows } from '../utils/tuition';
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const date = value => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
export default function ComparisonTuitionChart({ programs, loading }) {
  const rows = tuitionChartRows(programs), available = rows.filter(row => row.tuition);
  return <section className="comparison-tuition surface" aria-labelledby="tuition-title">
    <p className="eyebrow">Precios reportados por SNIES</p><h2 id="tuition-title">Matrícula para estudiantes nuevos</h2>
    <p>Compara los montos publicados en pesos colombianos (COP). La fuente no especifica el periodo de cobro ni la vigencia de cada precio. Confirma ambos con la institución antes de decidir.</p>
    {loading ? <p role="status">Consultando precios de los programas seleccionados…</p> : <>
      {!available.length && <p role="status">No hay precios reportados para las ofertas seleccionadas. Consulta las fuentes institucionales de abajo.</p>}
      <ol className="tuition-chart" aria-label="Montos de matrícula reportados por programa">{rows.map(({ program, tuition, width }, index) => {
        const fees = publishedAdditionalCosts(program), costSource = officialCostSource(program);
        return <li key={program.id}>
        <div className="tuition-row-heading"><div><span className="comparison-option-label">Opción {String.fromCharCode(65 + index)}</span><h3>{program.institution}</h3><p>{program.name} · {program.city}</p></div><strong>{tuition ? money.format(tuition.amount) : 'Sin información'}</strong></div>
        {tuition && <><div className="tuition-track" aria-hidden="true"><div className="tuition-bar" style={{ width: width + '%' }} /></div><p className="subtle">Consulta de la fuente: {date(tuition.importedAt)}. Vigencia del precio: por confirmar.</p></>}
        <details className="tuition-details"><summary>Ver detalles y otros costos</summary>
          <dl className="tuition-facts">
            <div><dt>Matrícula reportada</dt><dd>{tuition ? money.format(tuition.amount) + ' COP' : 'Sin información'}</dd></div>
            <div><dt>Aplica a</dt><dd>{tuition ? 'Estudiantes nuevos' : 'Por confirmar con la institución'}</dd></div>
            <div><dt>Periodo de cobro</dt><dd>No especificado en el precio SNIES</dd></div>
            <div><dt>Vigencia del monto SNIES</dt><dd>Por confirmar</dd></div>
            <div><dt>Periodicidad académica del programa</dt><dd>{program.periodicity || 'Sin información'}. Este dato no confirma el periodo de cobro.</dd></div>
            <div><dt>Créditos del programa completo</dt><dd>{program.credits || 'Sin información'}</dd></div>
            <div><dt>Código SNIES</dt><dd>{program.sniesCode || 'Sin información'}</dd></div>
          </dl>
          {fees ? <div className="tuition-additional"><h4>Tarifas oficiales adicionales · {fees.year}</h4><dl className="tuition-facts">{fees.items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{money.format(item.amount)} COP{item.note && <p className="subtle">{item.note}</p>}</dd></div>)}</dl><p>{fees.note}</p><p className="subtle">Fuente consultada el {date(fees.checkedAt)}.</p></div> : <p>La fuente SNIES no informa inscripción, seguro, precio por crédito ni derechos de grado para esta opción. Consulta las tarifas de la institución.</p>}
          <p>Materiales, transporte y vivienda dependen de tu situación. El costo total del programa y los descuentos aplicables están por confirmar.</p>
          <div className="tuition-links">{costSource && <a className="btn btn-secondary" href={costSource.url} target="_blank" rel="noopener noreferrer">{costSource.dedicated ? 'Consultar tarifas oficiales' : 'Consultar costos con la institución'} ↗</a>}<Link className="text-link" to="/becas">Ver becas y financiación →</Link></div>
        </details>
      </li>; })}</ol>
      {available.length > 0 && <p className="subtle"><a className="text-link" href={available[0].tuition.source} target="_blank" rel="noopener noreferrer">Ver fuente oficial SNIES ↗</a>. Valores de matrícula para estudiantes nuevos, sin estimar inscripción, materiales, transporte ni descuentos.</p>}
    </>}
  </section>;
}
