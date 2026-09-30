import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useExploration } from '../contexts/ExplorationContext';
import { programHref } from '../utils/programs';
import { useOfficialPrograms } from '../hooks/useOfficialPrograms';
const rows = [['Institución',p=>p.institution],['Programa',p=>p.name],['Título otorgado',p=>p.awardedTitle],['Nivel',p=>p.level],['Ciudad',p=>p.city],['Duración publicada',p=>p.duration],['Modalidad',p=>p.modality],['Estado publicado',p=>p.status],['Costo',()=>null],['Enfoque',()=>null]];
const value = v => v || 'No disponible en este catálogo';
export default function ComparePage() {
  const { comparison: storedComparison, toggleCompare, clearComparison, persistent } = useExploration();
  const comparison = useOfficialPrograms(storedComparison);
  return <main className="page"><div className="container"><Link className="back-link" to="/programas">← Volver a programas</Link><PageHeader title="Comparar programas">Revisa hasta tres opciones. La comparación organiza información; la decisión es tuya.</PageHeader>
    <p className="notice">Selección guardada en este dispositivo. Los resúmenes pueden estar desactualizados: abre cada programa para consultar la fuente actual. {comparison.some(p=>p.provenance==='demo') && 'La selección incluye datos ficticios de demostración.'}</p>
    {!persistent && <p role="status">La selección permanecerá solo durante esta visita.</p>}
    <div className="results-line"><strong>{comparison.length} de 3 programas</strong><button className="btn btn-secondary" type="button" onClick={clearComparison} disabled={!comparison.length}>Limpiar comparación</button></div>
    {comparison.length ? <><div className="comparison-selection">{comparison.map(p=><div key={p.id}><strong>{p.name}</strong><button className="text-link plain-button" type="button" aria-label={`Quitar ${p.name} de comparación`} onClick={()=>toggleCompare(p)}>Quitar</button></div>)}</div>
    <div className="compare-wrap compare-desktop"><table className="compare-table"><caption className="sr-only">Comparación de programas seleccionados</caption><thead><tr><th scope="col">Criterio</th>{comparison.map(p=><th scope="col" key={p.id}>{p.name}</th>)}</tr></thead><tbody>{rows.map(([label,get])=><tr key={label}><th scope="row">{label}</th>{comparison.map(p=><td key={p.id}>{value(get(p))}</td>)}</tr>)}</tbody></table></div>
    <div className="compare-mobile">{rows.map(([label,get])=><section className="comparison-criterion" key={label}><h2>{label}</h2><dl>{comparison.map(p=><div key={p.id}><dt>{p.name}</dt><dd>{value(get(p))}</dd></div>)}</dl></section>)}</div>
    <div className="comparison-selection">{comparison.map(p=>programHref(p) ? <Link className="btn btn-primary" key={p.id} to={programHref(p)}>Ver {p.name}</Link> : <p className="subtle" key={p.id}>Detalle no disponible para {p.name}: falta el código publicado.</p>)}</div></> : <div className="empty-state"><h2>Aún no has elegido programas</h2><p>Añádelos desde el catálogo o el detalle de cada programa.</p><Link className="btn btn-primary" to="/programas">Explorar programas</Link></div>}
  </div></main>;
}
