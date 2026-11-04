import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import { useExploration } from '../contexts/ExplorationContext';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useScholarshipRecommendations } from '../hooks/useScholarshipRecommendations';
import ScholarshipBrand from '../components/ScholarshipBrand';
import ScholarshipMatch from '../components/ScholarshipMatch';
import { scholarships } from '../data/scholarships';
import { financingTypes, getScholarships, scholarshipDate, scholarshipItem, scholarshipStates, scholarshipStatus, scholarshipStatusLabel, hasRepayment } from '../services/scholarships';
import '../styles/scholarships.css';
import '../styles/scholarship-personalization.css';

const filterNames = { q: 'Búsqueda', city: 'Lugar', level: 'Nivel', type: 'Financiación', status: 'Estado', opportunity: 'Oportunidad guardada', audience: 'Para quién', eligibility: 'Elegibilidad', repayment: 'Devolución', coverage: 'Cobertura', saved: 'Mis guardados', forYou: 'Para ti' };
const intents = ['Ingreso', 'Matriculados', 'Bajos recursos', 'Excelencia', 'Internacional', 'Universidad pública'];
const optionsFor = key => [...new Set(scholarships.flatMap(item => item[key] || []))].sort((a, b) => a.localeCompare(b, 'es'));

function SelectFilter({ label, value, options, onChange }) {
  return <label className="scholarship-field">{label}<select value={value} onChange={event => onChange(event.target.value)}><option value="">Todos</option>{options.map(option => {
    const [id, text] = Array.isArray(option) ? option : [option, option];
    return <option key={id} value={id}>{text}</option>;
  })}</select></label>;
}
function OfficialLink({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span><span className="scholarship-sr"> (abre en otra pestaña)</span></a>; }

function ScholarshipCard({ item, now, expanded, match, showMatch }) {
  const status = scholarshipStatus(item, now), dated = status === 'upcoming' ? item.opensAt : item.deadline;
  return <article className="scholarship-card" id={item.id} aria-labelledby={`title-${item.id}`}>
    <div className="scholarship-card-identity"><ScholarshipBrand item={item}/><div className="scholarship-title-block"><div className="scholarship-card-top"><p className="scholarship-provider">{item.provider}</p><span className={`scholarship-state scholarship-state-${status}`}>{scholarshipStatusLabel(status)}</span></div><h2 id={`title-${item.id}`}>{item.name}</h2></div></div>
    <p className="scholarship-metadata"><strong>{item.type}</strong><span>{item.levels.join(' · ')}</span><span>{item.location}</span></p>
    <p className="scholarship-coverage">{item.coverage}</p>
    {hasRepayment(item) && <p className="scholarship-obligation"><strong>Compromiso financiero:</strong> {item.repayment}</p>}
    {item.applicationStage === 'preselection' && <p className="scholarship-obligation">Etapa restringida: requiere admisión o preselección previa. {item.deadlineNote}</p>}
    {item.recommendationRules?.studentStages?.length === 1 && <p className="scholarship-key-condition">{item.recommendationRules.studentStages[0] === 'enrolled' ? 'Dirigida a estudiantes ya matriculados.' : 'Dirigida a quienes buscan ingresar.'}{item.recommendationRules.admissionRequired && ' Exige admisión previa.'}</p>}
    {showMatch && <ScholarshipMatch result={match} compact />}
    <div className="scholarship-card-bottom"><span className="scholarship-date">{dated ? <>{status === 'upcoming' ? 'Abre' : 'Cierre publicado'} <time dateTime={dated}>{scholarshipDate(dated)}</time></> : status === 'institutional' ? 'Fechas de cada institución o programa' : 'Sin calendario actual confirmado'}</span><div className="scholarship-actions"><OfficialLink href={item.officialUrl}>Fuente oficial</OfficialLink><BookmarkButton id={`opportunity-${item.id}`} label={item.name} item={scholarshipItem(item)} /></div></div>
    <details className="scholarship-detail" open={expanded || undefined}>
      <summary>Ver requisitos y condiciones</summary>
      <ScholarshipMatch result={match} />
      <div className="scholarship-detail-grid">
        <section><h3>Sobre la oportunidad</h3><p>{item.description}</p><h3>Quién puede postularse</h3><p>{item.eligibility}. {item.audience?.join(' · ')}</p><p><strong>Residencia exigida:</strong> {item.residency || 'Consultar condiciones de la entidad.'}</p><p><strong>Modalidad:</strong> {item.modality || 'Según el programa elegido.'}</p><h3>Requisitos principales</h3><ul>{item.requirements.map(value => <li key={value}>{value}</li>)}</ul></section>
        <section><h3>Calendario y condiciones</h3><p>{item.cycle}</p><dl><dt>Apertura</dt><dd>{scholarshipDate(item.opensAt)}</dd><dt>Cierre</dt><dd>{scholarshipDate(item.deadline)}</dd></dl><p>{item.deadlineNote}</p><h3>Obligaciones</h3><p>{item.repayment}</p>{item.restrictions && <p>{item.restrictions}</p>}<h3>Documentos</h3><p>{item.documents?.join(' · ') || 'Revisa el listado y los formatos en las bases oficiales.'}</p></section>
      </div>
      <div className="scholarship-provenance"><div><strong>{item.verification === 'verified' ? 'Fuente oficial revisada' : 'Verificación parcial'}</strong><p>Consulta: {scholarshipDate(item.verifiedAt)}. {item.verificationNote}</p></div><div className="scholarship-document-links">{item.termsUrl && <OfficialLink href={item.termsUrl}>Reglamento / bases</OfficialLink>}{item.applicationUrl && item.applicationUrl !== item.officialUrl && <OfficialLink href={item.applicationUrl}>Ir a postulación</OfficialLink>}</div></div>
      <p className="scholarship-fine-print">El resumen no confirma tu elegibilidad. La entidad valida los requisitos y puede modificar su calendario.</p>
    </details>
  </article>;
}

export default function ScholarshipsPage() {
  const [params, setParams] = useSearchParams(), [limit, setLimit] = useState(12);
  const { saved } = useExploration(), profile = useAcademicProfile();
  const { user } = useAuth();
  const personalized = useScholarshipRecommendations(), { now } = personalized;
  const value = key => params.get(key) || '';
  const filters = Object.fromEntries(Object.keys(filterNames).map(key => [key === 'q' ? 'query' : key, value(key)]));
  filters.order = value('order');
  const matching = getScholarships(filters, now).filter(item => !value('saved') || saved.some(entry => entry.id === `opportunity-${item.id}`));
  const forYou = value('forYou') === 'yes' && Boolean(user);
  const matchingIds = new Set(matching.map(item => item.id));
  const recommendationIds = new Set(personalized.recommendations.map(row => row.item.id));
  const explicitOrder = value('order') && value('order') !== 'current';
  const filtered = !forYou ? matching : explicitOrder ? matching.filter(item => recommendationIds.has(item.id)) : personalized.recommendations.filter(row => matchingIds.has(row.item.id)).map(row => row.item);
  const evaluatedById = new Map(personalized.evaluations.map(row => [row.item.id, row]));
  const counts = scholarships.reduce((result, item) => { const state = scholarshipStatus(item, now); result[state] = (result[state] || 0) + 1; return result; }, {});
  const active = Object.keys(filterNames).filter(key => value(key));
  const featured = active.length ? [] : getScholarships({ status: 'open' }, now).slice(0, 3);
  function updateFilter(key, nextValue) {
    setLimit(12);
    setParams(current => { const next = new URLSearchParams(current); if (nextValue) next.set(key, nextValue); else next.delete(key); return next; }, { replace: true });
  }
  function clear() { setParams({}, { replace: true }); setLimit(12); }
  function allStates() {
    setLimit(12);
    setParams(current => { const next = new URLSearchParams(current); next.delete('status'); next.delete('forYou'); return next; }, { replace: true });
  }
  return <main className="scholarships-page"><div className="container scholarships-content">
    <header className="scholarship-editorial"><div><p className="scholarship-kicker">EDUPLAN / FINANCIACIÓN EDUCATIVA</p><h1>Becas y oportunidades<br className="scholarship-title-break" /> para estudiar</h1><p>Becas, créditos condonables y apoyos educativos. Explora las condiciones y encuentra una opción para tu próximo paso.</p></div><div className="scholarship-header-note"><span>Una decisión con información</span><p>Consulta cuánto cubre, quién puede postularse y si tendrás que devolver el dinero.</p><Link to="/guias">Cómo preparar tu postulación →</Link></div></header>
    <div className="scholarship-statistics" aria-label="Resumen del catálogo"><div><strong>{scholarships.length}</strong><span>oportunidades</span></div><div><strong>{counts.open || 0}</strong><span>abiertas verificadas</span></div><div><strong>{counts.upcoming || 0}</strong><span>próximas</span></div><div><strong>{counts.institutional || 0}</strong><span>por calendario institucional</span></div></div>
    {featured.length > 0 && <section className="scholarship-featured" aria-labelledby="scholarship-featured-title"><header><h2 id="scholarship-featured-title">En el radar</h2><p>Abiertas verificadas, en orden de cierre. Revisa los requisitos antes de postularte.</p></header><div>{featured.map(item => <Link className="scholarship-feature" key={item.id} to={scholarshipItem(item).href}><ScholarshipBrand item={item}/><div><span>Cierra {scholarshipDate(item.deadline)}</span><h3>{item.name}</h3><strong className="scholarship-feature-type">{item.type}</strong><p>{item.coverage}</p>{hasRepayment(item) && <small>Puede exigir devolución. Revisa las condiciones.</small>}</div><span className="scholarship-feature-arrow" aria-hidden="true">↗</span></Link>)}</div></section>}
    <div className="scholarship-discovery"><label className="scholarship-search">Buscar oportunidades<input type="search" value={value('q')} placeholder="Nombre, entidad, región o beneficio" onChange={event => updateFilter('q', event.target.value)} /></label><div className="scholarship-quick" aria-label="Vigencia"><button type="button" aria-pressed={!value('status') && !forYou} onClick={allStates}>Todas</button>{['open', 'upcoming'].map(state => <button type="button" key={state} aria-pressed={value('status') === state} onClick={() => updateFilter('status', state)}>{state === 'open' ? 'Abiertas' : 'Próximas'} <span>{counts[state] || 0}</span></button>)}{user && <button type="button" aria-pressed={forYou} onClick={() => updateFilter('forYou', forYou ? '' : 'yes')}>Para ti</button>}<button type="button" aria-pressed={value('saved') === 'yes'} onClick={() => updateFilter('saved', value('saved') ? '' : 'yes')}>Mis guardados</button></div></div>
    {value('forYou') && !user && <p className="scholarship-profile-prompt">El catálogo es público. <Link to="/login?returnTo=%2Fbecas%3FforYou%3Dyes">Inicia sesión</Link> para usar tus preferencias en «Para ti».</p>}
    {forYou && <div className="scholarship-profile-prompt"><strong>Tu perfil orienta esta selección.</strong> Afinidad no equivale a elegibilidad. {personalized.incomplete && <>Puedes completar las respuestas opcionales en <Link to="/perfil#apoyo">Apoyo para tus estudios</Link>.</>}{(personalized.state === 'loading' || personalized.financingState === 'loading') && <p role="status">Consultando tus preferencias…</p>}{personalized.error && <p role="alert">No pudimos leer todas tus preferencias. Las coincidencias disponibles son parciales. <button type="button" className="plain-button text-link" onClick={personalized.retry}>Reintentar</button></p>}</div>}
    <div className="scholarship-workspace"><aside className="scholarship-filter-panel" aria-label="Filtrar oportunidades"><h2>Encuentra tu opción</h2>
      <SelectFilter label="Lugar de estudio" value={value('city')} options={[...new Set([...optionsFor('city'), ...optionsFor('region')])].sort((a, b) => a.localeCompare(b, 'es'))} onChange={next => updateFilter('city', next)} />
      <SelectFilter label="Nivel educativo" value={value('level')} options={optionsFor('levels')} onChange={next => updateFilter('level', next)} />
      {profile?.state === 'ready' && profile.preferences.academicLevel && <button type="button" className="scholarship-text-button" onClick={() => updateFilter('level', profile.preferences.academicLevel)}>Usar nivel de mi perfil: {profile.preferences.academicLevel}</button>}
      <SelectFilter label="Tipo de financiación" value={value('type')} options={financingTypes} onChange={next => updateFilter('type', next)} />
      <SelectFilter label="Estado" value={value('status')} options={Object.entries(scholarshipStates)} onChange={next => updateFilter('status', next)} />
      <SelectFilter label="¿Para quién?" value={value('audience')} options={intents} onChange={next => updateFilter('audience', next)} />
      <details className="scholarship-more-filters" open={['eligibility', 'repayment', 'coverage'].some(key => value(key)) || undefined}><summary>Más criterios</summary><SelectFilter label="Elegibilidad" value={value('eligibility')} options={optionsFor('eligibility')} onChange={next => updateFilter('eligibility', next)} /><SelectFilter label="Devolución" value={value('repayment')} options={ [['yes', 'Con pago o compromiso condicionado'], ['no', 'Sin devolución financiera declarada']] } onChange={next => updateFilter('repayment', next)} /><label className="scholarship-field">Cobertura<input type="search" placeholder="Matrícula, sostenimiento…" value={value('coverage')} onChange={event => updateFilter('coverage', event.target.value)} /></label></details>
      <button type="button" className="scholarship-text-button" onClick={clear}>Limpiar filtros</button><p className="scholarship-filter-note">Los filtros organizan la información publicada. Revisa todos los requisitos antes de postularte.</p>
    </aside><section className="scholarship-results" aria-label="Oportunidades de financiación">
      <div className="scholarship-results-toolbar"><p role="status"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'oportunidad encontrada' : 'oportunidades encontradas'}</p><SelectFilter label="Ordenar" value={value('order') || 'current'} options={ [['current', 'Abiertas y próximas primero'], ['closing', 'Próximas a cerrar'], ['opening', 'Aperturas próximas'], ['verified', 'Recientemente verificadas'], ['asc', 'Nombre A–Z']] } onChange={next => updateFilter('order', next)} /></div>
      {active.length > 0 && <div className="scholarship-active-filters" aria-label="Filtros activos">{active.map(key => <button type="button" key={key} onClick={() => updateFilter(key, '')} aria-label={`Quitar filtro ${filterNames[key]}`}>{filterNames[key]}: {key === 'status' ? scholarshipStatusLabel(value(key)) : key === 'saved' ? 'Sí' : key === 'opportunity' ? 'Selección' : value(key)} <span aria-hidden="true">×</span></button>)}</div>}
      <div className="scholarship-list">{filtered.slice(0, limit).map(item => <ScholarshipCard key={item.id} item={item} now={now} match={user && profile.state === 'ready' ? evaluatedById.get(item.id) : null} showMatch={forYou} expanded={value('opportunity') === item.id} />)}</div>
      {filtered.length === 0 && <div className="scholarship-empty"><span>Sin coincidencias</span><h2>Probemos con menos condiciones</h2><p>No hay oportunidades de esta selección que coincidan con tus filtros.</p><button type="button" className="btn btn-outline" onClick={clear}>Ver todas las oportunidades</button></div>}
      {filtered.length > limit && <button type="button" className="btn btn-outline scholarship-load-more" onClick={() => setLimit(current => current + 12)}>Ver más oportunidades ({filtered.length - limit} restantes)</button>}
      <div className="scholarship-editorial-note"><h2>Fuentes oficiales, con fecha de revisión</h2><p>La consulta se registra en cada oportunidad. «Abierta» exige evidencia de recepción de solicitudes; «Próxima» indica una apertura anunciada. «Por verificar» no confirma una convocatoria vigente. Las cerradas se conservan para conocer el programa.</p><p>Los beneficios por calendario institucional dependen de cada admisión o matrícula. Guardar una oportunidad no inicia una postulación.</p><p><a href="/logos/scholarships/credits.html">Fuentes y créditos de las imágenes</a></p></div>
    </section></div>
  </div></main>;
}
