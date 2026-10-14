import { Link } from 'react-router-dom';
import { officialCostSource } from '../utils/program-costs';
import { tuitionChartRows } from '../utils/tuition';
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const date = value => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
export default function ComparisonTuitionChart({ programs, loading }) {
  const rows = tuitionChartRows(programs), available = rows.filter(row => row.tuition);
  return <section id="compare-tuition" className="comparison-tuition surface" aria-labelledby="tuition-title" aria-busy={loading}>
    <p className="eyebrow">SNIES y tarifas oficiales de universidades</p><h2 id="tuition-title">Comparación de precios de matrícula</h2>
    <p>Consulta los montos publicados en pesos colombianos (COP). Revisa la vigencia y el periodo de cada tarifa: los valores SNIES pueden no especificarlos. Los montos con periodos distintos no son directamente comparables.</p>
    {loading && <p role="status">Consultando precios de los programas seleccionados…</p>}
    <>
      {!loading && !available.length && <p role="status">No hay precios reportados para las ofertas seleccionadas. Consulta las fuentes institucionales de abajo.</p>}
      <ol className="tuition-chart" aria-label="Montos de matrícula reportados por programa">{rows.map(({ program, tuition, width }, index) => {
        const costSource = tuition?.basis === 'INSTITUTION_PUBLISHED' ? {url:tuition.source, dedicated:true} : officialCostSource(program);
        return <li key={program.id}>
        <div className="tuition-row-heading"><div><span className="comparison-option-label">Opción {String.fromCharCode(65 + index)}</span><h3>{program.institution}</h3><p>{program.name} · {program.city}</p></div><strong>{tuition ? money.format(tuition.amount) : loading ? 'Consultando…' : 'Precio por confirmar'}</strong></div>
        <div className={'tuition-track' + (!tuition ? ' tuition-track-unavailable' : '')} aria-hidden="true">{tuition ? <div className="tuition-bar" style={{ width: width + '%' }} /> : <span>{loading ? 'Consultando precio' : 'Sin monto publicado para graficar'}</span>}</div>
        {tuition && <p className="subtle">{tuition.basis === 'INSTITUTION_PUBLISHED' ? 'Tarifa institucional' : 'Monto reportado en SNIES'} · Consulta: {date(tuition.importedAt)} · Vigencia: {tuition.priceYear || 'por confirmar'}.</p>}
        {!tuition && <p>No hay un monto confirmado para esta oferta. Consulta la matrícula vigente y los requisitos con la institución.</p>}
        <div className="tuition-links">{costSource && <a className="btn btn-secondary" href={costSource.url} target="_blank" rel="noopener noreferrer">{costSource.dedicated ? 'Consultar tarifas oficiales' : 'Consultar costos con la institución'} ↗</a>}<Link className="text-link" to="/becas">Ver becas y financiación →</Link></div>
        <details className="tuition-details"><summary>Ver información de la matrícula</summary>
          <dl className="tuition-facts">
            <div><dt>Matrícula reportada</dt><dd>{tuition ? money.format(tuition.amount) + ' COP' : 'Sin información'}</dd></div>
            <div><dt>Aplica a</dt><dd>{tuition ? 'Estudiantes nuevos' : 'Por confirmar con la institución'}</dd></div>
            <div><dt>Periodo de cobro</dt><dd>{tuition?.billingPeriod === 'SEMESTER' ? 'Primer semestre' : tuition?.billingPeriod === 'FIRST_ENROLLMENT' ? 'Primer ingreso; periodo por confirmar' : 'No especificado en la fuente'}</dd></div>
            <div><dt>Vigencia del monto</dt><dd>{tuition?.priceYear || 'Por confirmar'}</dd></div>
            {tuition?.note && <div><dt>Condiciones</dt><dd>{tuition.note}</dd></div>}
            {tuition?.sourcePage && <div><dt>Página del documento oficial</dt><dd>{tuition.sourcePage}</dd></div>}
            <div><dt>Periodicidad académica del programa</dt><dd>{program.periodicity || 'Sin información'}. Este dato no confirma el periodo de cobro.</dd></div>
            <div><dt>Código SNIES</dt><dd>{program.sniesCode || 'Sin información'}</dd></div>
          </dl>
          <p>Materiales, transporte y vivienda dependen de tu situación. El costo total del programa y los descuentos aplicables están por confirmar.</p>
        </details>
      </li>; })}</ol>
      {available.length > 0 && <p className="subtle">Valores de matrícula para estudiantes nuevos, sin estimar inscripción, materiales, transporte ni descuentos. <a className="text-link" href="https://hecaa.mineducacion.gov.co/consultaspublicas/programas" target="_blank" rel="noopener noreferrer">Consultar SNIES ↗</a></p>}
    </>
  </section>;
}
