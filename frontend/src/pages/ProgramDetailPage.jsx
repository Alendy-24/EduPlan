import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import CompareButton from '../components/CompareButton';
import AsyncState from '../components/AsyncState';
import SectionTabs from '../components/SectionTabs';
import { getProgramsByCode } from '../services/programs';
import { programHref, programItem } from '../utils/programs';
import { programs as demos, demoInstitution } from '../data/mock/catalog';
const tabs = ['Descripción','Plan de estudios','Admisión','Costos','Perfil profesional'];
export default function ProgramDetailPage() {
  const { programId } = useParams(); const [params] = useSearchParams();
  const [result, setResult] = useState({ code: '', rows: [] });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry,setRetry] = useState(0), [tab,setTab] = useState(tabs[0]);
  const demo = demos.find(p => p.id === programId);
  const rows = demo ? [{ ...demo, provenance: 'demo' }] : result.code === programId ? result.rows : [];
  const recordId = params.get('registro');
  const program = recordId ? rows.find(p => p.sourceId === recordId) : rows.length === 1 ? rows[0] : null;
  useEffect(() => {
    setTab(tabs[0]); setError('');
    if (demo) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    getProgramsByCode(programId,controller.signal).then(values => { if (!controller.signal.aborted) { setResult({ code: programId, rows: values.programs, unusableCount: values.unusableCount }); setLoading(false); } }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoading(false); } });
    return () => controller.abort();
  }, [programId,retry,demo]);
  return <main className="page"><div className="container"><Link className="back-link" to="/programas">← Volver a programas</Link>
    <AsyncState loading={loading} error={error} onRetry={() => setRetry(v=>v+1)} />
    {!loading && !error && result.code === programId && result.unusableCount > 0 && <p className="subtle" role="status">{result.unusableCount} registros recibidos no tienen identidad o información suficiente para mostrarse.</p>}
    {!loading && !error && !program && <section><h1>{recordId ? 'Registro no disponible' : rows.length ? 'Selecciona un registro del programa' : 'Programa no encontrado'}</h1><p>{recordId ? 'La fila solicitada no aparece en el catálogo. No hemos elegido otra en su lugar.' : 'Un mismo código puede identificar varias filas publicadas. Elige la ubicación y modalidad que deseas consultar.'}</p><div className="listing">{rows.map(p => <Link className="surface record-option" to={programHref(p)} key={p.id}><strong>{p.name}</strong><span>{p.institution} · {p.city} · {p.modality} · {p.status || 'Estado no disponible'}</span></Link>)}</div></section>}
    {!loading && !error && program && <>
      <p className="notice">{demo ? 'Datos ficticios de demostración. No representan una oferta académica verificada.' : 'Información del catálogo público del Ministerio de Educación. Confirma vigencia y requisitos con la institución.'}</p>
      <section className={`program-hero${program.image ? '' : ' program-no-image'}`}>{program.image && <img src={program.image} alt="Espacio de estudio de referencia" />}<div><p className="eyebrow">{program.institution}</p><h1>{program.name}</h1><p>{demo ? program.description : `Estado publicado: ${program.status || 'No disponible'}`}</p>{program.reviewRequired && <p className="provenance-note">{program.nameOrigin === 'AWARDED_TITLE' ? 'Se muestra el título otorgado porque el nombre publicado requiere revisión.' : 'El nombre publicado requiere verificación.'}</p>}<div className="detail-actions"><BookmarkButton id={`program-${program.id}`} label={program.name} item={programItem(program)} /><CompareButton program={program} /><Link className="text-link" to="/comparar">Ver comparación</Link></div></div></section>
      <SectionTabs items={tabs} value={tab} onChange={setTab} label="Secciones del programa"><div className="detail-grid"><section className="detail-copy"><h2>{tab}</h2>{tab === 'Descripción' ? <><dl className="facts surface">{[[program.reviewRequired ? 'Nombre publicado (sin verificar)' : 'Nombre publicado',program.rawName],['Nivel académico',program.level],['Nivel de formación',program.educationLevel],['Ciudad',program.city],['Modalidad',program.modality],['Duración publicada',program.duration],['Título otorgado',program.awardedTitle],['Área de conocimiento',program.area],['Jornada',null]].map(([label,value]) => <div className="fact-row" key={label}><dt>{label}</dt><dd>{value || 'No disponible en este catálogo'}</dd></div>)}</dl>{!demo && <p>La fuente no incluye una descripción académica detallada. No completamos ese campo con información de ejemplo.</p>}</> : <p>No disponible en este catálogo. Consulta {tab.toLocaleLowerCase('es')} directamente con la institución.</p>}</section><aside className="facts surface"><h2>{program.institution}</h2>{demo || /^\d+$/.test(program.institutionCode) ? <Link className="text-link" to={`/instituciones/${encodeURIComponent(demo ? demoInstitution.id : program.institutionCode)}`}>Ver institución →</Link> : <p className="subtle">Enlace a institución no disponible en este catálogo.</p>}<p className="subtle">El catálogo no incluye un enlace oficial específico de este programa.</p><BookmarkButton id={`program-${program.id}`} label={program.name} item={programItem(program)} /></aside></div></SectionTabs>
    </>}
  </div></main>;
}
