import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import CompareButton from '../components/CompareButton';
import AsyncState from '../components/AsyncState';
import SectionTabs from '../components/SectionTabs';
import { getProgramsByCode } from '../services/programs';
import { getProgramLink } from '../services/program-links';
import ProgramOfficialLink from '../components/ProgramOfficialLink';
import { getInstitutionByCode } from '../services/institutions';
import { websiteUrl } from '../utils/website';
import { programHref, programItem, withOfficialProgram } from '../utils/programs';
import { programs as demos, demoInstitution } from '../data/mock/catalog';
const tabs = ['Descripción','Plan de estudios','Admisión','Costos','Perfil profesional'];
const guidance = {
  'Plan de estudios': ['Consulta las asignaturas y créditos del plan vigente.', 'Revisa prácticas, opciones de grado y requisitos para graduarte.'],
  'Admisión': ['Confirma el calendario de inscripción y el periodo de ingreso.', 'Consulta documentos, pruebas, entrevistas y requisitos del nivel académico.'],
  'Costos': ['Solicita el valor de matrícula del periodo al que deseas ingresar.', 'Pregunta por derechos de inscripción, materiales y otros gastos.', 'Confirma becas, descuentos y condiciones de financiación directamente con la institución.'],
  'Perfil profesional': ['Consulta los objetivos y competencias del programa oficial.', 'Revisa sus campos de trabajo y requisitos para ejercer la profesión.'],
};
export default function ProgramDetailPage() {
  const { programId } = useParams(); const [params] = useSearchParams();
  const [result, setResult] = useState({ code: '', rows: [] });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry,setRetry] = useState(0), [tab,setTab] = useState(tabs[0]);
  const demo = demos.find(p => p.id === programId);
  const rows = demo ? [{ ...demo, provenance: 'demo' }] : result.code === programId ? result.rows : [];
  const recordId = params.get('registro');
  const selectedProgram = recordId ? rows.find(p => p.sourceId === recordId) : rows.length === 1 ? rows[0] : null;
  const [institutionResult,setInstitutionResult] = useState(null), [institutionError,setInstitutionError] = useState(''), [institutionRetry,setInstitutionRetry] = useState(0);
  const [officialLoading,setOfficialLoading] = useState(false);
  const [shareMessage,setShareMessage] = useState('');
  const [linkState,setLinkState] = useState({ sourceId:'',loading:false });
  const [linkRetry,setLinkRetry] = useState(0);
  const sourceId = selectedProgram?.sourceId;
  const programLink = linkState.sourceId === sourceId ? linkState : { loading:Boolean(sourceId) };
  const program = selectedProgram ? withOfficialProgram(selectedProgram,programLink) : null;
  useEffect(() => {
    if (demo || !sourceId) { setLinkState({ sourceId:'',loading:false }); return; }
    const controller = new AbortController();
    setLinkState({ sourceId,loading:true });
    getProgramLink(sourceId,controller.signal).then(value => { if (!controller.signal.aborted) setLinkState({ ...value,loading:false }); }).catch(reason => { if (!controller.signal.aborted) setLinkState({ sourceId,loading:false,error:reason.message }); });
    return () => controller.abort();
  }, [sourceId,demo,linkRetry]);
  const institutionCode = program?.institutionCode;
  const official = institutionResult && institutionCode && institutionResult.code === institutionCode ? websiteUrl(institutionResult.website) : null;
  useEffect(() => {
    setInstitutionResult(null); setInstitutionError(''); setShareMessage(''); setOfficialLoading(false);
    if (demo || !/^\d+$/.test(institutionCode || '')) return;
    const controller = new AbortController();
    setOfficialLoading(true);
    getInstitutionByCode(institutionCode,controller.signal).then(value => { if (!controller.signal.aborted) setInstitutionResult(value); }).catch(() => { if (!controller.signal.aborted) setInstitutionError('No pudimos consultar el sitio oficial de la institución.'); }).finally(() => { if (!controller.signal.aborted) setOfficialLoading(false); });
    return () => controller.abort();
  }, [institutionCode,institutionRetry,demo,recordId]);
  async function share() { try { await navigator.clipboard.writeText(window.location.href); setShareMessage('Enlace copiado.'); } catch { setShareMessage('No pudimos copiar el enlace. Puedes copiar la dirección del navegador.'); } }
  useEffect(() => {
    setTab(tabs[0]); setError('');
    if (demo) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    getProgramsByCode(programId,controller.signal).then(values => { if (!controller.signal.aborted) { setResult({ code: programId, rows: values.programs, unusableCount: values.unusableCount, checkedAt: new Date().toISOString() }); setLoading(false); } }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoading(false); } });
    return () => controller.abort();
  }, [programId,retry,demo]);
  return <main className="page"><div className="container"><Link className="back-link" to="/programas">← Volver a programas</Link>
    <AsyncState loading={loading} error={error} onRetry={() => setRetry(v=>v+1)} />
    {!loading && !error && result.code === programId && result.unusableCount > 0 && <p className="subtle" role="status">{result.unusableCount} registros recibidos no tienen identidad o información suficiente para mostrarse.</p>}
    {!loading && !error && !program && <section><h1>{recordId ? 'Registro no disponible' : rows.length ? 'Selecciona un registro del programa' : 'Programa no encontrado'}</h1><p>{recordId ? 'La fila solicitada no aparece en el catálogo. No hemos elegido otra en su lugar.' : 'Un mismo código puede identificar varias filas publicadas. Elige la ubicación y modalidad que deseas consultar.'}</p><div className="listing">{rows.map(p => <Link className="surface record-option" to={programHref(p)} key={p.id}><strong>{p.name}</strong><span>{p.institution} · {p.city} · {p.modality} · {p.status || 'Estado no disponible'}</span></Link>)}</div></section>}
    {!loading && !error && program && <>
      <p className="notice">{demo ? 'Datos ficticios de demostración. No representan una oferta académica verificada.' : 'Información del catálogo público del Ministerio de Educación. Confirma vigencia y requisitos con la institución.'}</p>
      <section className={`program-hero${program.image ? '' : ' program-no-image'}`}>{program.image && <img src={program.image} alt="Espacio de estudio de referencia" />}<div><p className="eyebrow">{program.institution}</p>{program.nameOrigin === 'AWARDED_TITLE' && <p className="subtle">Nombre del programa sin confirmar · título otorgado</p>}<h1>{program.name}</h1>{program.awardedTitle && program.nameOrigin !== 'AWARDED_TITLE' && <p><strong>Título otorgado:</strong> {program.awardedTitle}</p>}<p>{demo ? program.description : `Estado publicado: ${program.status || 'No disponible'}`}</p>{program.nameOrigin === 'OFFICIAL_PAGE' && <p className="provenance-note">Nombre del programa confirmado en su página oficial. Conservamos los datos originales del catálogo por separado.</p>}{program.reviewRequired && program.nameOrigin !== 'OFFICIAL_PAGE' && <p className="provenance-note">{program.nameOrigin === 'AWARDED_TITLE' ? 'Este es el título otorgado. El nombre del programa en la fuente requiere verificación con la institución.' : 'El nombre publicado requiere verificación.'}</p>}<div className="detail-actions"><BookmarkButton id={`program-${program.id}`} label={program.name} item={programItem(program)} /><CompareButton program={program} /><Link className="text-link" to="/comparar">Ver comparación</Link><button className="btn btn-secondary" type="button" onClick={share}>Compartir</button></div>{shareMessage && <p role="status">{shareMessage}</p>}</div></section>
      <SectionTabs items={tabs} value={tab} onChange={setTab} label="Secciones del programa"><div className="detail-grid"><section className="detail-copy"><h2>{tab}</h2>{tab === 'Descripción' ? <><dl className="facts surface">{[['Nombre del programa',['SOURCE_NAME','OFFICIAL_PAGE'].includes(program.nameOrigin) ? program.name : null],['Título otorgado',program.awardedTitle],[program.reviewRequired ? 'Dato original del campo nombre (sin verificar)' : 'Nombre publicado en el catálogo',program.rawName],['Institución',program.institution],['Código publicado',program.code],['Nivel académico',program.level],['Nivel de formación',program.educationLevel],['Ciudad',program.city],['Departamento',program.department],['Modalidad',program.modality],['Duración publicada',program.duration],['Estado publicado',program.status],['Área de conocimiento',program.area],['Jornada',null]].map(([label,value]) => <div className="fact-row" key={label}><dt>{label}</dt><dd>{value || 'No disponible en este catálogo'}</dd></div>)}</dl>{!demo && <p className="subtle">Consultado el {new Date(result.checkedAt).toLocaleDateString('es-CO')}. La fuente no publica descripción académica detallada ni costos.</p>}</> : <><p>La información de {tab.toLocaleLowerCase('es')} no está disponible en este catálogo. Estas preguntas pueden ayudarte a confirmarla con la institución:</p><ul>{guidance[tab].map(text => <li key={text}>{text}</li>)}</ul>{(programLink.url || official) && <a className="btn btn-primary" href={programLink.url || official} target="_blank" rel="noreferrer">{programLink.url ? 'Consultar la página oficial del programa' : 'Consultar el sitio institucional'} ↗</a>}</>}</section><aside className="facts surface"><h2>Consulta la información oficial</h2><p>{program.institution}</p><ProgramOfficialLink state={programLink} onRetry={() => setLinkRetry(value=>value+1)} />{demo || /^\d+$/.test(program.institutionCode) ? <Link className="text-link" to={`/instituciones/${encodeURIComponent(demo ? demoInstitution.id : program.institutionCode)}`}>Ver institución →</Link> : <p className="subtle">Enlace a institución no disponible en este catálogo.</p>}{officialLoading && <p className="subtle" role="status">Consultando el sitio institucional…</p>}{official && <><p><a className="btn btn-secondary" href={official} target="_blank" rel="noreferrer">Sitio oficial de la institución ↗</a></p><p className="subtle">Enlace publicado en el catálogo oficial de instituciones. Confirma allí admisión y costos del programa.</p></>}{institutionError && <><p role="status">{institutionError}</p><button className="text-link plain-button" type="button" onClick={()=>setInstitutionRetry(value=>value+1)}>Reintentar sitio oficial</button></>}{!demo && <p><a href="https://www.datos.gov.co/d/upr9-nkiz" target="_blank" rel="noreferrer">Fuente del Ministerio de Educación ↗</a></p>}<BookmarkButton id={`program-${program.id}`} label={program.name} item={programItem(program)} /></aside></div></SectionTabs>
    </>}
  </div></main>;
}
