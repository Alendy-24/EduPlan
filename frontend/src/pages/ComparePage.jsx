import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useExploration } from '../contexts/ExplorationContext';
import { programHref } from '../utils/programs';
import { websiteUrl } from '../utils/website';
import { comparisonGroups, comparisonRowState, comparisonValue, comparisonDuration, comparisonLocation, comparisonPriorities, priorityRow, comparisonNoteKey } from '../utils/comparison';
import { useOfficialPrograms } from '../hooks/useOfficialPrograms';
import { useComparisonPrograms } from '../hooks/useComparisonPrograms';
import { useComparisonWorkspace } from '../hooks/useComparisonWorkspace';
import ComparisonSummary from '../components/ComparisonSummary';
import ComparisonShare from '../components/ComparisonShare';
import ProgramPersonalMatch from '../components/ProgramPersonalMatch';
import ProgramOfficialLink from '../components/ProgramOfficialLink';
import { useProgramLinks } from '../hooks/useProgramLinks';
import '../styles/comparison-page.css';
const optionLabel = index => 'Opción ' + String.fromCharCode(65 + index);
const nameOf = program => comparisonValue(program.name) || 'Programa guardado';
function ComparedValue({ value }) { return value ? <span>{value}</span> : <span className="comparison-unknown">Por confirmar</span>; }
export default function ComparePage() {
  const { comparison: storedComparison, toggleCompare, clearComparison, persistent } = useExploration();
  const workspace = useComparisonWorkspace();
  const current = useComparisonPrograms(storedComparison);
  const comparison = useOfficialPrograms(current.programs);
  const [onlyDifferences,setOnlyDifferences] = useState(false);
  const sourceIds = comparison.filter(program=>program.provenance === 'real').map(program=>program.sourceId);
  const links = useProgramLinks(sourceIds);
  const groups = comparisonGroups.map(group=>({...group, rows:group.rows.map(row=>({...row,...comparisonRowState(row,comparison),priority:priorityRow(row.key,workspace.priorities)}))}));
  const differenceCount = groups.flatMap(group=>group.rows).filter(row=>row.differs).length;
  const hasFallback = comparison.some(program=>['saved','error','missing'].includes(program.comparisonState));
  return <main className="page comparison-page" style={{ '--comparison-count': Math.max(1,comparison.length) }}><div className="container">
    <Link className="back-link" to="/programas">← Volver a programas</Link>
    <PageHeader title="Comparar programas">Encuentra las diferencias entre tus opciones y decide qué se ajusta mejor a ti.</PageHeader>
    {!comparison.length ? <div className="empty-state surface"><h2>Aún no has elegido programas</h2><p>Elige dos o tres opciones para revisar sus diferencias en un mismo lugar.</p><Link className="btn btn-primary" to="/programas">Explorar programas</Link></div> : <>
      <div className="comparison-toolbar"><div><strong>{comparison.length} de 3 programas</strong><p>Tu selección se conserva en este dispositivo.</p></div><div className="comparison-toolbar-actions">{comparison.length < 3 && <Link className="btn btn-primary" to="/programas">Añadir otra opción</Link>}<button className="btn btn-secondary" type="button" onClick={()=>{clearComparison();workspace.clearFavorite();}}>Limpiar comparación</button></div></div>
      <div className="comparison-data-status" role="status">{current.loading ? 'Actualizando la información del catálogo…' : hasFallback ? 'Algunas opciones muestran el resumen guardado. No pudimos confirmar todos sus datos actuales.' : comparison.every(program=>program.provenance==='demo') ? 'Selección con datos ficticios de demostración.' : 'Datos actualizados para esta comparación. Confirma la oferta vigente con cada institución.'}{!current.loading && sourceIds.length > 0 && <button className="text-link plain-button" type="button" onClick={current.refresh}>Actualizar información</button>}</div>
      {!persistent && <p className="notice" role="status">La selección permanecerá solo durante esta visita.</p>}
      {comparison.some(program=>program.provenance==='demo') && <p className="notice">La selección incluye datos ficticios de demostración.</p>}
      <section className="comparison-options" aria-label="Opciones seleccionadas">{comparison.map((program,index)=><article className={'comparison-option surface' + (workspace.favorite === program.id ? ' comparison-option-favorite' : '')} key={program.id}>
        <div className="comparison-option-heading"><span className="comparison-option-label">{optionLabel(index)}</span><button className="plain-button text-link" type="button" aria-label={'Quitar ' + nameOf(program) + ' de comparación en ' + program.institution} onClick={()=>{toggleCompare(program);if(workspace.favorite === program.id) workspace.clearFavorite();}}>Quitar</button></div>
        <button className="comparison-favorite-button" type="button" aria-pressed={workspace.favorite === program.id} aria-label={'Marcar como favorita: ' + nameOf(program) + ' en ' + program.institution} onClick={()=>workspace.toggleFavorite(program.id)}><span aria-hidden="true">{workspace.favorite === program.id ? '★' : '☆'}</span> {workspace.favorite === program.id ? 'Mi favorita' : 'Elegir como favorita'}</button>
        <h2>{nameOf(program)}</h2><p className="comparison-institution">{comparisonValue(program.institution) || 'Institución por confirmar'}</p><p>{comparisonLocation(program) || 'Ubicación por confirmar'}</p>
        <div className="comparison-option-facts"><span>{comparisonValue(program.modality) || 'Modalidad por confirmar'}</span><span>{comparisonDuration(program) || 'Duración por confirmar'}</span></div>
        {program.status && <p className="comparison-offer-status">Estado publicado: {program.status}</p>}
        {program.comparisonState==='missing' && <p className="comparison-stale">No encontramos esta oferta al actualizar. Confirma con la institución si sigue disponible.</p>}
        {['error','saved'].includes(program.comparisonState) && <p className="comparison-stale">Mostramos la información que guardaste. Intenta actualizarla de nuevo.</p>}
        {programHref(program) ? <Link className="btn btn-secondary" to={programHref(program)}>Ver programa</Link> : <p className="subtle">Detalle por confirmar.</p>}
      </article>)}</section>
      {comparison.length === 1 && <div className="comparison-single notice"><strong>Ya tienes una opción.</strong> Añade otra para descubrir qué cambia en ubicación, modalidad y formación.</div>}
      <p className="comparison-favorite-help">Marca la opción que más te convence. Puedes cambiar tu favorita cuando quieras.</p>
      <section className="comparison-priorities surface" aria-labelledby="comparison-priorities-title"><h2 id="comparison-priorities-title">Mis prioridades</h2><p>Elige lo que más te importa. Lo destacaremos en la comparación, aunque las opciones coincidan.</p>
        <fieldset><legend className="sr-only">Qué es importante para ti</legend><div className="comparison-priority-choices">{comparisonPriorities.map(priority=><button key={priority.key} type="button" aria-pressed={workspace.priorities.includes(priority.key)} onClick={()=>workspace.togglePriority(priority.key)}>{workspace.priorities.includes(priority.key) && <span aria-hidden="true">✓ </span>}{priority.label}</button>)}</div></fieldset>
        {workspace.priorities.length === 0 && <p className="subtle">Puedes elegir más de una prioridad o comparar sin seleccionar ninguna.</p>}
      </section>
      <ComparisonSummary programs={comparison} priorities={workspace.priorities} loading={current.loading} />
      <ComparisonShare programs={comparison} />
      <section className="comparison-details" aria-labelledby="comparison-details-title">
        <div className="comparison-section-heading"><div><p className="eyebrow">Los datos para decidir</p><h2 id="comparison-details-title">Compara lo que importa</h2><p>{comparison.length > 1 ? differenceCount + ' ' + (differenceCount===1 ? 'diferencia entre tus opciones' : 'diferencias entre tus opciones') + ' con la información disponible.' : 'Revisa la información publicada de esta opción.'}</p></div><label className="comparison-differences"><input type="checkbox" checked={onlyDifferences && comparison.length > 1} disabled={comparison.length < 2} onChange={event=>setOnlyDifferences(event.target.checked)} />Ocultar coincidencias</label></div>
        <nav className="comparison-section-nav" aria-label="Secciones de la comparación">{groups.map(group=><a key={group.id} href={'#compare-' + group.id}>{group.title}</a>)}<a href="#compare-decisions">Costos y admisión</a><a href="#compare-notes">Mis notas</a></nav>
        {groups.map(group=>{
          const rows = group.rows.filter(row=>!onlyDifferences || comparison.length < 2 || !row.same || row.priority);
          return <section key={group.id} className="comparison-group" id={'compare-' + group.id}><h3>{group.title}</h3><p className="subtle">{group.description}</p>
            {!rows.length ? <p className="comparison-all-same">No hay diferencias en los datos disponibles de esta sección.</p> : <>
              <div className="compare-wrap compare-desktop"><table className="compare-table"><caption className="sr-only">{group.title}: comparación entre las opciones seleccionadas</caption><thead><tr><th scope="col">Qué comparar</th>{comparison.map((program,index)=><th scope="col" key={program.id}><span className="comparison-option-label">{optionLabel(index)}</span><strong>{program.institution || nameOf(program)}</strong></th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.key} className={(row.differs ? 'comparison-row-different ' : '') + (row.priority ? 'comparison-row-priority' : '')}><th scope="row">{row.label}{row.priority && <span className="comparison-priority-label">Tu prioridad</span>}{row.differs && <span className="comparison-difference-label">Diferente</span>}</th>{comparison.map((program,index)=><td key={program.id}><ComparedValue value={row.values[index]} /></td>)}</tr>)}</tbody></table></div>
              <div className="compare-mobile">{rows.map(row=><section key={row.key} className={'comparison-criterion' + (row.differs ? ' comparison-row-different' : '') + (row.priority ? ' comparison-row-priority' : '')}><h4>{row.label}{row.priority && <span className="comparison-priority-label">Tu prioridad</span>}{row.differs && <span className="comparison-difference-label">Diferente</span>}</h4><dl>{comparison.map((program,index)=><div key={program.id}><dt><span className="comparison-option-label">{optionLabel(index)}</span> {program.institution || nameOf(program)}</dt><dd><ComparedValue value={row.values[index]} /></dd></div>)}</dl></section>)}</div>
            </>}
          </section>;
        })}
      </section>
      <section className="comparison-decisions" id="compare-decisions"><p className="eyebrow">Antes de elegir</p><h2>Costos, admisión y plan de estudios</h2><p>Consulta con cada institución la matrícula, las fechas de ingreso y las asignaturas del programa. Aquí tienes qué preguntar.</p>
        <div className="comparison-question-grid"><article className="surface"><h3>¿Cuánto costaría estudiar?</h3><ul><li>Matrícula por periodo y derechos de inscripción.</li><li>Materiales, transporte y vivienda, si debes trasladarte.</li><li>Becas, descuentos y financiación disponibles.</li></ul><Link className="text-link" to="/becas">Explorar becas →</Link></article><article className="surface"><h3>¿Cómo y cuándo ingresar?</h3><ul><li>Fechas de inscripción e inicio de clases.</li><li>Documentos, pruebas y requisitos de admisión.</li><li>Horarios y cupos del periodo que te interesa.</li></ul></article><article className="surface"><h3>¿Qué aprenderías?</h3><ul><li>Asignaturas y énfasis del plan vigente.</li><li>Prácticas, convenios y opciones de grado.</li><li>Perfil profesional y requisitos para graduarte.</li></ul></article></div>
        <h3 className="comparison-sources-title">Consulta cada opción</h3>
        {links.error && <p className="notice" role="status">No pudimos consultar los enlaces de los programas. Puedes abrir el sitio institucional.<button className="plain-button text-link" type="button" onClick={links.retry}>Reintentar enlaces</button></p>}
        <div className="comparison-sources">{comparison.map((program,index)=>{
          const institutional = websiteUrl(program.institutionWebsite), official = links.data.find(link=>link.sourceId===program.sourceId);
          return <article key={program.id} className="surface"><span className="comparison-option-label">{optionLabel(index)}</span><h4>{program.institution || nameOf(program)}</h4>
            {program.provenance==='real' && !links.error && <ProgramOfficialLink state={{...links,...official}} onRetry={links.retry} />}
            {institutional && <a className="btn btn-secondary" href={institutional} target="_blank" rel="noopener noreferrer">Sitio de la institución ↗</a>}
            {!institutional && !official?.url && <p className="subtle">{program.provenance==='demo' ? 'Esta opción es de demostración.' : 'Sitio institucional por confirmar. Consulta el detalle para ver las fuentes disponibles.'}</p>}
            {programHref(program) && <Link className="text-link" to={programHref(program)}>Ver detalle y fuentes →</Link>}
          </article>;
        })}</div>
      </section>
      <section className="comparison-notes" id="compare-notes"><h2>Mis notas por programa</h2><p>Anota lo que confirmes con cada universidad y las preguntas que te faltan por resolver.</p>
        <div className="comparison-note-grid">{comparison.map((program,index)=>{
          const key = comparisonNoteKey(program), text = workspace.notes[key] ?? workspace.notes[program.id] ?? '';
          return <article key={program.id} className="surface"><span className="comparison-option-label">{optionLabel(index)}</span><h3>{program.institution || nameOf(program)}</h3>
            <div className="field"><label htmlFor={'comparison-note-'+index}>Notas personales para {program.institution || nameOf(program)}</label><textarea id={'comparison-note-'+index} value={text} maxLength={2000} rows={5} onChange={event=>workspace.setNote(key,event.target.value,program.id)} placeholder="Matrícula confirmada, horarios, fechas, dudas…" /></div>
            <div className="comparison-note-footer"><span>{text.length}/2000</span>{text && <button className="plain-button text-link" type="button" onClick={()=>workspace.setNote(key,'',program.id)}>Borrar esta nota</button>}</div>
          </article>;
        })}</div><p className="subtle" role="status">{workspace.persistent ? 'Tu favorita, tus prioridades y tus notas se guardan en este navegador, por separado para cada cuenta. Las notas son personales; no son información oficial del programa.' : 'No pudimos guardar en este navegador. Tu favorita, tus prioridades y tus notas estarán disponibles durante esta visita.'}</p>
      </section>
      <ProgramPersonalMatch sourceIds={sourceIds} comparison />
    </>}
  </div></main>;
}
