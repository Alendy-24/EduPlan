import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useExploration } from '../contexts/ExplorationContext';
import { programHref } from '../utils/programs';
import { websiteUrl } from '../utils/website';
import { comparisonGroups, comparisonRowState, comparisonValue, comparisonNoteKey, filterComparisonPrograms } from '../utils/comparison';
import { tuitionChartRows } from '../utils/tuition';
import { officialCostSource } from '../utils/program-costs';
import { useOfficialPrograms } from '../hooks/useOfficialPrograms';
import { useComparisonPrograms } from '../hooks/useComparisonPrograms';
import { useComparisonWorkspace } from '../hooks/useComparisonWorkspace';
import ComparisonShare from '../components/ComparisonShare';
import ProgramOfficialLink from '../components/ProgramOfficialLink';
import { useProgramLinks } from '../hooks/useProgramLinks';
import '../styles/comparison-page.css';

const nameOf = program => comparisonValue(program.name) || 'Programa guardado';
const money = new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 });
const emptyFilters = { query:'', city:'', modality:'', educationLevel:'' };
const filterFields = [{ key:'city', label:'Ciudad' }, { key:'modality', label:'Modalidad' }, { key:'educationLevel', label:'Nivel de formación' }];
const essentialKeys = ['institution', 'city', 'department', 'sector', 'modality', 'duration', 'educationLevel', 'awardedTitle', 'credits', 'status'];
const essentialRows = essentialKeys.map(key => comparisonGroups.flatMap(group => group.rows).find(row => row.key === key));

function TuitionValue({ program, loading }) {
  const tuition = tuitionChartRows([program])[0].tuition;
  const source = tuition?.basis === 'INSTITUTION_PUBLISHED' ? { url:tuition.source } : officialCostSource(program);
  const period = { FREE_TRAINING:'Formación gratuita', SEMESTER:'Por semestre', ACADEMIC_PERIOD:'Por periodo académico', FIRST_ENROLLMENT:'Primer ingreso; periodo por confirmar' };
  return <><strong>{tuition ? money.format(tuition.amount) + ' COP' : loading ? 'Consultando…' : 'Por confirmar'}</strong>
    {tuition && <><span className="comparison-cell-detail">{period[tuition.billingPeriod] || 'Periodo de cobro por confirmar'} · Vigencia: {tuition.priceYear || 'por confirmar'}</span><span className="comparison-cell-detail">{tuition.basis === 'INSTITUTION_PUBLISHED' ? 'Tarifa institucional' : 'Monto reportado en SNIES'} · Consulta: {tuition.importedAt}</span>{tuition.note && <details><summary>Condiciones de la tarifa</summary><p>{tuition.note}</p></details>}</>}
    {source && <a className="text-link comparison-cell-detail" href={source.url} target="_blank" rel="noopener noreferrer">Consultar costos oficiales ↗</a>}
  </>;
}

export default function ComparePage() {
  const { comparison:storedComparison, toggleCompare, clearComparison, persistent } = useExploration();
  const workspace = useComparisonWorkspace();
  const current = useComparisonPrograms(storedComparison);
  const comparison = useOfficialPrograms(current.programs);
  const [filters, setFilters] = useState(emptyFilters);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const visible = filterComparisonPrograms(comparison, filters);
  const sourceIds = comparison.filter(program => program.provenance === 'real').map(program => program.sourceId);
  const links = useProgramLinks(sourceIds);
  const rows = essentialRows.map(row => ({ ...row, ...comparisonRowState(row, visible) }))
    .filter(row => !onlyDifferences || visible.length < 2 || !row.same);
  const hasFallback = comparison.some(program => ['saved','error','missing'].includes(program.comparisonState));
  const activeFilters = Object.values(filters).some(Boolean) || onlyDifferences;
  const resetFilters = () => { setFilters(emptyFilters); setOnlyDifferences(false); };
  return <main className="page comparison-page"><div className="container">
    <Link className="back-link" to="/programas">← Volver a programas</Link>
    <PageHeader title="Comparar programas">Revisa los datos más importantes de tus opciones en una sola tabla.</PageHeader>
    {!comparison.length ? <div className="empty-state surface"><h2>Aún no has elegido programas</h2><p>Elige dos o tres opciones para revisar sus diferencias en un mismo lugar.</p><Link className="btn btn-primary" to="/programas">Explorar programas</Link></div> : <>
      <div className="comparison-toolbar"><div><strong>{comparison.length} de 3 programas</strong><p>Tu selección se conserva en este dispositivo.</p></div><div className="comparison-toolbar-actions">{comparison.length < 3 && <Link className="btn btn-primary" to="/programas">Añadir otra opción</Link>}<button className="btn btn-secondary" type="button" onClick={() => { clearComparison(); workspace.clearFavorite(); resetFilters(); }}>Limpiar comparación</button></div></div>
      <div className="comparison-data-status" role="status">{current.loading ? 'Actualizando la información del catálogo…' : hasFallback ? 'Algunas opciones muestran el resumen guardado. No pudimos confirmar todos sus datos actuales.' : comparison.every(program => program.provenance === 'demo') ? 'Selección con datos ficticios de demostración.' : 'Datos actualizados para esta comparación. Confirma la oferta vigente con cada institución.'}{!current.loading && sourceIds.length > 0 && <button className="text-link plain-button" type="button" onClick={current.refresh}>Actualizar información</button>}</div>
      {!persistent && <p className="notice" role="status">La selección permanecerá solo durante esta visita.</p>}
      {comparison.some(program => program.provenance === 'demo') && <p className="notice">La selección incluye datos ficticios de demostración.</p>}
      <section className="comparison-filters surface" aria-labelledby="comparison-filters-title">
        <h2 id="comparison-filters-title">Filtrar programas seleccionados</h2>
        <p>Busca dentro de tu comparación. Para buscar en todo el catálogo, <Link to="/programas">explora los programas</Link>.</p>
        <div className="comparison-filter-grid"><div className="field"><label htmlFor="comparison-search">Buscar programa o institución</label><input id="comparison-search" type="search" placeholder="Ej. ingeniería o universidad" value={filters.query} onChange={event => setFilters({ ...filters, query:event.target.value })} /></div>
          {filterFields.map(({ key, label }) => <div className="field" key={key}><label htmlFor={'comparison-filter-' + key}>{label}</label><select id={'comparison-filter-' + key} value={filters[key]} onChange={event => setFilters({ ...filters, [key]:event.target.value })}><option value="">Todas las opciones</option>{[...new Set(comparison.map(program => comparisonValue(program[key])).filter(Boolean))].sort((a,b) => a.localeCompare(b,'es')).map(value => <option key={value} value={value}>{value}</option>)}</select></div>)}
        </div>
        <div className="comparison-filter-footer"><label className="comparison-differences"><input type="checkbox" checked={onlyDifferences} disabled={visible.length < 2} onChange={event => setOnlyDifferences(event.target.checked)} />Ocultar coincidencias</label><button type="button" className="btn btn-secondary" disabled={!activeFilters} onClick={resetFilters}>Limpiar filtros</button><p role="status">Mostrando {visible.length} de {comparison.length} programas seleccionados.</p></div>
      </section>
      <section className="comparison-details" aria-labelledby="comparison-details-title" style={{ '--comparison-count':Math.max(1,visible.length) }}>
        <div className="comparison-section-heading"><div><h2 id="comparison-details-title">Información principal</h2><p>Los datos sin información publicada aparecen como «Por confirmar».</p></div></div>
        {!visible.length ? <div className="empty-state surface"><h3>No hay programas que coincidan con los filtros</h3><p>Prueba otra búsqueda o limpia los filtros para ver toda tu selección.</p><button type="button" className="btn btn-primary" onClick={resetFilters}>Ver todos los seleccionados</button></div> : <>
          <p className="subtle comparison-scroll-help">En pantallas pequeñas, desliza la tabla horizontalmente para ver todas las opciones.</p>
          <div className="compare-wrap comparison-main-table" role="region" aria-label="Tabla comparativa de programas" tabIndex={0}><table className="compare-table"><caption className="sr-only">Información principal de los programas seleccionados</caption><thead><tr><th scope="col">Qué comparar</th>{visible.map(program => <th scope="col" key={program.id}>
            <strong>{nameOf(program)}</strong><span className="comparison-cell-detail">{comparisonValue(program.institution) || 'Institución por confirmar'}</span>
            <div className="comparison-table-actions"><button className="comparison-favorite-button" type="button" aria-pressed={workspace.favorite === program.id} aria-label={'Marcar como favorita: ' + nameOf(program) + ' en ' + program.institution} onClick={() => workspace.toggleFavorite(program.id)}>{workspace.favorite === program.id ? '★ Mi favorita' : '☆ Favorita'}</button><button className="plain-button text-link" type="button" aria-label={'Quitar ' + nameOf(program) + ' de comparación en ' + program.institution} onClick={() => { toggleCompare(program); if (workspace.favorite === program.id) workspace.clearFavorite(); }}>Quitar</button></div>
            {program.provenance === 'demo' && <p className="subtle">Datos de demostración.</p>}
            {program.comparisonState === 'missing' && <p className="comparison-stale">No encontramos esta oferta al actualizar. Confirma con la institución si sigue disponible.</p>}
            {['error','saved'].includes(program.comparisonState) && <p className="comparison-stale">Mostramos la información que guardaste. Intenta actualizarla de nuevo.</p>}
          </th>)}</tr></thead><tbody>
            {rows.map(row => <tr key={row.key} className={row.differs ? 'comparison-row-different' : ''}><th scope="row">{row.label}{row.differs && <span className="comparison-difference-label">Diferente</span>}</th>{visible.map((program,index) => <td key={program.id}>{row.values[index] || <span className="comparison-unknown">Por confirmar</span>}</td>)}</tr>)}
            <tr><th scope="row">Matrícula publicada (COP)</th>{visible.map(program => <td key={program.id}><TuitionValue program={program} loading={current.loading} /></td>)}</tr>
            <tr><th scope="row">Detalle y fuentes</th>{visible.map(program => {
              const official = links.data.find(link => link.sourceId === program.sourceId);
              const institutional = websiteUrl(program.institutionWebsite);
              return <td key={program.id}>{programHref(program) && <Link className="btn btn-secondary" to={programHref(program)}>Ver programa</Link>}{program.provenance === 'real' && <ProgramOfficialLink state={{ ...links, ...official }} onRetry={links.retry} />}{institutional && <a className="text-link comparison-cell-detail" href={institutional} target="_blank" rel="noopener noreferrer">Sitio de la institución ↗</a>}</td>;
            })}</tr>
          </tbody></table></div>
          <p className="subtle">La matrícula corresponde a valores publicados para estudiantes nuevos. Confirma vigencia, periodo de cobro, requisitos de admisión y plan de estudios con la institución. Los montos de periodos distintos no son directamente comparables. <Link to="/becas">Ver becas y financiación →</Link></p>
          {visible.length === 1 && <p className="notice">{comparison.length === 1 ? 'Ya tienes una opción. Añade otra para comparar.' : 'Solo una opción coincide con los filtros. Amplía la búsqueda para comparar más programas.'}</p>}
        </>}
      </section>
      <ComparisonShare programs={comparison} />
      <details className="comparison-notes comparison-notes-collapsible"><summary>Mis notas por programa</summary><p>Anota las preguntas y los datos que confirmes con cada institución. Las notas corresponden a toda tu selección.</p>
        <div className="comparison-note-grid" style={{ '--comparison-count':comparison.length }}>{comparison.map((program,index) => {
          const key = comparisonNoteKey(program), text = workspace.notes[key] ?? workspace.notes[program.id] ?? '';
          return <article key={program.id} className="surface"><h3>{nameOf(program)} · {program.institution}</h3><div className="field"><label htmlFor={'comparison-note-' + index}>Notas personales para {program.institution || nameOf(program)}</label><textarea id={'comparison-note-' + index} value={text} maxLength={2000} rows={5} onChange={event => workspace.setNote(key,event.target.value,program.id)} placeholder="Matrícula confirmada, horarios, fechas, dudas…" /></div><div className="comparison-note-footer"><span>{text.length}/2000</span>{text && <button className="plain-button text-link" type="button" onClick={() => workspace.setNote(key,'',program.id)}>Borrar esta nota</button>}</div></article>;
        })}</div><p className="subtle">{workspace.persistent ? 'Tu favorita y tus notas personales se guardan en este navegador, por separado para cada cuenta.' : 'Tu favorita y tus notas estarán disponibles durante esta visita.'}</p>
      </details>
    </>}
  </div></main>;
}
