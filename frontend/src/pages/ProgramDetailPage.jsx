import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import CompareButton from '../components/CompareButton';
import AsyncState from '../components/AsyncState';
import SectionTabs from '../components/SectionTabs';
import { getProgramsByCode } from '../services/programs';
import { websiteUrl } from '../utils/website';
import { academicProgramName, programHref, programItem } from '../utils/programs';
import { programs as demos, demoInstitution } from '../data/mock/catalog';
import ProgramPersonalMatch from '../components/ProgramPersonalMatch';
import ProgramOfficialLink from '../components/ProgramOfficialLink';
import { useProgramLinks } from '../hooks/useProgramLinks';
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
  const [shareMessage,setShareMessage] = useState('');
  const demo = demos.find(p => p.id === programId);
  const rows = demo ? [{ ...demo, provenance: 'demo' }] : result.code === programId ? result.rows : [];
  const recordId = params.get('registro');
  const program = recordId ? rows.find(p => p.sourceId === recordId) : rows.length === 1 ? rows[0] : null;
  const links = useProgramLinks(demo ? [] : [program?.sourceId]);
  const official = websiteUrl(program?.institutionWebsite);
  const institutionHref = demo ? '/instituciones/' + demoInstitution.id : /^\d+$/.test(program?.institutionCode || '') ? '/instituciones/' + program.institutionCode : null;
  async function share() { try { await navigator.clipboard.writeText(window.location.href); setShareMessage('Enlace copiado.'); } catch { setShareMessage('No pudimos copiar el enlace. Puedes copiar la dirección del navegador.'); } }
  useEffect(() => {
    setTab(tabs[0]); setError(''); setShareMessage('');
    if (demo) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    getProgramsByCode(programId,controller.signal).then(values => { if (!controller.signal.aborted) { setResult({ code: programId, rows: values.programs, unusableCount: values.unusableCount, checkedAt: new Date().toISOString() }); setLoading(false); } }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoading(false); } });
    return () => controller.abort();
  }, [programId,retry,demo]);
  const name = program && academicProgramName(program);
  return <main className="page"><div className="container"><Link className="back-link" to="/programas">← Volver a programas</Link>
    <AsyncState loading={loading} error={error} onRetry={() => setRetry(v=>v+1)} />
    {!loading && !error && result.code === programId && result.unusableCount > 0 && <p className="subtle" role="status">{result.unusableCount} registros recibidos no tienen identidad o información suficiente para mostrarse.</p>}
    {!loading && !error && !program && <section><h1>{recordId ? 'Registro no disponible' : rows.length ? 'Selecciona un registro del programa' : 'Programa no encontrado'}</h1><p>{recordId ? 'La fila solicitada no aparece en el catálogo. No hemos elegido otra en su lugar.' : 'Un mismo código puede identificar varias filas publicadas. Elige la ubicación y modalidad que deseas consultar.'}</p><div className="listing">{rows.map(p => <Link className="surface record-option" to={programHref(p)} key={p.id}><strong>{academicProgramName(p)}</strong><span>{p.institution} · {p.city} · {p.institutionCampus} · {p.modality} · {p.status || 'Estado no disponible'}</span></Link>)}</div></section>}
    {!loading && !error && program && <>
      <p className="notice">{demo ? 'Datos ficticios de demostración. No representan una oferta académica verificada.' : 'Información publicada por el Ministerio de Educación. Confirma vigencia y requisitos con la institución.'}</p>
      <section className={'program-hero' + (program.image ? '' : ' program-no-image')}>{program.image && <img src={program.image} alt="Espacio de estudio de referencia" />}<div>
        <p className="eyebrow">Programa académico</p><h1>{name}</h1><p className="program-institution">{program.institution}</p><p>{program.city}{program.institutionCampus && ' · ' + program.institutionCampus}</p>
        <div className="metadata">{[program.level, program.modality, program.status].filter(Boolean).map(value => <span key={value}>{value}</span>)}</div>
        <p className="program-title"><strong>Título otorgado:</strong> {program.awardedTitle || 'No disponible'}</p>
        <div className="institution-official-actions">{official && <a className="btn btn-primary" href={official} target="_blank" rel="noopener noreferrer">Sitio oficial de la institución ↗</a>}{institutionHref && <Link className="btn btn-secondary" to={institutionHref}>Ver institución</Link>}</div>
        {!demo && !official && <p className="subtle">{program.institutionEnrichmentUnavailable ? 'No pudimos consultar el sitio institucional.' : 'Sitio web institucional no disponible en el catálogo.'}{program.institutionEnrichmentUnavailable && <button className="plain-button text-link" type="button" onClick={() => setRetry(value => value + 1)}>Reintentar consulta</button>}</p>}
        <div className="detail-actions"><BookmarkButton id={'program-' + program.id} label={name} item={programItem(program)} /><CompareButton program={program} /><Link className="text-link" to="/comparar">Ver comparación</Link><button className="btn btn-secondary" type="button" onClick={share}>Compartir</button></div>{shareMessage && <p role="status">{shareMessage}</p>}
      </div></section>
      {!demo && <ProgramOfficialLink state={{...links,...links.data[0]}} onRetry={links.retry} />}
      {!demo && <ProgramPersonalMatch sourceIds={[program.sourceId]} />}
      <SectionTabs items={tabs} value={tab} onChange={setTab} label="Secciones del programa"><div className="detail-grid"><section className="detail-copy"><h2>{tab}</h2>{tab === 'Descripción' ? <><dl className="facts surface">{[['Nombre del programa',name],['Título otorgado',program.awardedTitle],['Institución',program.institution],['Sede institucional',program.institutionCampus],['Ciudad de la oferta',program.city],['Código SNIES',program.sniesCode],['Código del registro en el catálogo',program.code],['Nivel académico',program.level],['Nivel de formación',program.educationLevel],['Departamento',program.department],['Modalidad',program.modality],['Duración publicada',program.duration],['Estado publicado',program.status],['Núcleo básico de conocimiento (NBC)',program.area],['Área de conocimiento amplia',program.broadKnowledgeArea],['Créditos publicados',program.credits]].map(([label,value]) => <div className="fact-row" key={label}><dt>{label}</dt><dd>{value || 'No disponible en este catálogo'}</dd></div>)}</dl>{!demo && <p className="subtle">La fuente no publica descripción académica detallada ni costos.{program.nameOrigin === 'SNIES_NAME' && ' Nombre académico publicado en SNIES; catálogo de nombres consultado el ' + program.nameImportedAt + '.'}</p>}</> : <><p>La información de {tab.toLocaleLowerCase('es')} no está disponible en este catálogo. Estas preguntas pueden ayudarte a confirmarla con la institución:</p><ul>{guidance[tab].map(text => <li key={text}>{text}</li>)}</ul>{official && <a className="btn btn-primary" href={official} target="_blank" rel="noopener noreferrer">Sitio oficial de la institución ↗</a>}</>}</section>
      <aside className="facts surface"><h2>Información oficial</h2><p>Consulta la oferta y las condiciones de admisión directamente con {program.institution}.</p>{official && <p><a className="text-link" href={official} target="_blank" rel="noopener noreferrer">Sitio oficial de la institución ↗</a></p>}{institutionHref && <Link className="text-link" to={institutionHref}>Ver institución →</Link>}{!demo && <><p><a href="https://hecaa.mineducacion.gov.co/consultaspublicas/programas" target="_blank" rel="noopener noreferrer">Consulta pública SNIES ↗</a></p><p><a href="https://www.datos.gov.co/d/upr9-nkiz" target="_blank" rel="noopener noreferrer">Catálogo del Ministerio de Educación ↗</a></p></>}</aside>
      </div></SectionTabs>
    </>}
  </div></main>;
}
