import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import students from '../assets/Images/estudiantess.avif';
import { scholarshipsVerifiedAt } from '../data/scholarships';
import {
  getScholarships, scholarshipDate, scholarshipItem, scholarshipStatus, scholarshipStatusLabel, scholarshipToday,
} from '../services/scholarships';
import '../styles/scholarships.css';

const filterNames = { q: 'Búsqueda', city: 'Lugar', level: 'Nivel', type: 'Tipo', status: 'Estado', opportunity: 'Oportunidad guardada' };
const states = [['open', 'Abiertas'], ['upcoming', 'Próximas'], ['review', 'Consultar vigencia'], ['closed', 'Cerradas']];

export default function ScholarshipsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [moreFilters, setMoreFilters] = useState(() => ['type', 'status', 'order'].some(key => searchParams.has(key)));
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';
  const level = searchParams.get('level') || '';
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const opportunity = searchParams.get('opportunity') || '';
  const order = searchParams.get('order') || 'current';
  const today = scholarshipToday();
  const filtered = useMemo(() => getScholarships({ query, city, level, type, status, opportunity, order }, today),
    [query, city, level, type, status, opportunity, order, today]);
  const activeFilters = Object.keys(filterNames).filter(key => searchParams.get(key));

  function updateFilter(key, value) {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  function filterText(key) {
    const value = searchParams.get(key);
    if (key === 'status') return states.find(([id]) => id === value)?.[1] || value;
    if (key === 'opportunity') return 'Oportunidad guardada';
    return `${filterNames[key]}: ${value}`;
  }

  return (
    <main className="scholarships-page">
      <section className="hero scholarships-hero">
        <img className="hero-photo" src={students} alt="Estudiantes conversando sobre opciones de financiación" />
        <div className="container hero-content">
          <span className="eyebrow">Opciones para financiar tus estudios</span>
          <h1>Becas y oportunidades</h1>
          <p>Revisa apoyos reales, sus requisitos y el calendario publicado por cada entidad.</p>
        </div>
      </section>
      <div className="container scholarships-content">
        <div className="scholarship-source-notice">
          <strong>Fuentes oficiales, con fecha de revisión</strong>
          <p>Esta selección se revisó manualmente el <time dateTime={scholarshipsVerifiedAt}>{scholarshipDate(scholarshipsVerifiedAt)}</time>. Los calendarios pueden cambiar; confirma la convocatoria en la fuente oficial antes de postularte.</p>
        </div>
        <div className="filter-bar scholarship-filters">
          <label className="field">Buscar oportunidades
            <input type="search" placeholder="Beca, entidad o requisito" value={query} onChange={event => updateFilter('q', event.target.value)} />
          </label>
          <label className="field">Lugar de estudio
            <select value={city} onChange={event => updateFilter('city', event.target.value)}>
              <option value="">Todos</option>
              <option value="Colombia">En Colombia</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Medellín">Medellín y Valle de Aburrá</option>
              <option value="Exterior">En el exterior</option>
            </select>
          </label>
          <label className="field">Nivel
            <select value={level} onChange={event => updateFilter('level', event.target.value)}>
              <option value="">Todos</option>
              <option>Pregrado</option>
              <option>Posgrado</option>
            </select>
          </label>
          <button className="btn btn-outline" type="button" aria-expanded={moreFilters} aria-controls="scholarship-extra-filters" onClick={() => setMoreFilters(value => !value)}>{moreFilters ? 'Menos filtros' : 'Más filtros'}</button>
          <div id="scholarship-extra-filters" className="scholarship-extra-filters" hidden={!moreFilters}>
            <label className="field">Tipo de oportunidad
              <select value={type} onChange={event => updateFilter('type', event.target.value)}><option value="">Todos</option><option>Beca</option><option>Crédito</option><option>Apoyo</option></select>
            </label>
            <label className="field">Estado de la convocatoria
              <select value={status} onChange={event => updateFilter('status', event.target.value)}><option value="">Todos</option>{states.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>
            </label>
            <label className="field">Ordenar
              <select value={order} onChange={event => updateFilter('order', event.target.value === 'current' ? '' : event.target.value)}><option value="current">Abiertas y próximas primero</option><option value="asc">Nombre A–Z</option><option value="desc">Nombre Z–A</option></select>
            </label>
          </div>
        </div>
        {activeFilters.length > 0 && <div className="scholarship-active-filters" aria-label="Filtros activos">
          {activeFilters.map(key => <button type="button" className="scholarship-filter-chip" key={key} onClick={() => updateFilter(key, '')} aria-label={`Quitar filtro ${filterText(key)}`}>{filterText(key)} <span aria-hidden="true">×</span></button>)}
          <button type="button" className="plain-button" onClick={() => setSearchParams({}, { replace: true })}>Limpiar filtros</button>
        </div>}
        <div className="two-column scholarships-layout">
          <section aria-label="Oportunidades de financiación">
            <div className="results-line" aria-live="polite"><strong>{filtered.length} {filtered.length === 1 ? 'oportunidad' : 'oportunidades'} con fuente oficial</strong></div>
            <div className="listing">
              {filtered.map(item => {
                const currentStatus = scholarshipStatus(item, today);
                return <article className="surface scholarship-card" key={item.id} id={item.id} aria-labelledby={`title-${item.id}`}>
                  <div className="scholarship-card-heading">
                    <div><p className="scholarship-provider">{item.provider}</p><h2 id={`title-${item.id}`}>{item.name}</h2></div>
                    <span className={`scholarship-state scholarship-state-${currentStatus}`}>{scholarshipStatusLabel(currentStatus)}</span>
                  </div>
                  <p>{item.description}</p>
                  <div className="metadata"><span>{item.type}</span><span>{item.levels.join(' · ')}</span><span>{item.location}</span></div>
                  <dl className="scholarship-facts">
                    <div><dt>Cobertura y condiciones</dt><dd>{item.coverage}</dd></div>
                    <div><dt>{currentStatus === 'closed' ? 'Cierre publicado' : 'Fecha de cierre'}</dt><dd>{item.deadline ? <time dateTime={item.deadline}>{scholarshipDate(item.deadline)}</time> : 'Consultar convocatoria vigente'}{item.opensAt && <span> · Apertura publicada: <time dateTime={item.opensAt}>{scholarshipDate(item.opensAt)}</time></span>}</dd></div>
                  </dl>
                  <p className="scholarship-cycle">{item.cycle}. {item.deadlineNote}</p>
                  <details className="scholarship-requirements"><summary>Requisitos principales</summary><ul>{item.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul><p>Este resumen no sustituye los términos completos de la convocatoria.</p></details>
                  <div className="scholarship-card-footer">
                    <div className="scholarship-actions">
                      <a className="btn btn-primary" href={item.officialUrl} target="_blank" rel="noopener noreferrer" aria-label={`Consultar fuente oficial de ${item.name} (abre en otra pestaña)`}>Fuente oficial ↗</a>
                      {item.termsUrl && <a className="btn btn-outline" href={item.termsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Leer términos oficiales de ${item.name} (PDF en otra pestaña)`}>Términos (PDF) ↗</a>}
                      <BookmarkButton id={`opportunity-${item.id}`} label={item.name} item={scholarshipItem(item)} />
                    </div>
                    <small>Revisado: <time dateTime={item.verifiedAt}>{scholarshipDate(item.verifiedAt)}</time></small>
                  </div>
                </article>;
              })}
            </div>
            {filtered.length === 0 && <div className="empty-state surface"><h2>Sin coincidencias</h2><p>Cambia los filtros para explorar otras oportunidades de esta selección.</p><button type="button" className="btn btn-outline" onClick={() => setSearchParams({}, { replace: true })}>Limpiar filtros</button></div>}
          </section>
          <aside className="scholarship-sidebar">
            <div className="cta-panel"><h2>Prepara tu postulación</h2><p>Comprueba si el apoyo cubre matrícula o sostenimiento, si exige devolución y qué documentos necesitas. Cada entidad recibe las solicitudes en su propia plataforma.</p><Link className="btn btn-outline" to="/guias">Ver guía de financiación →</Link></div>
            <div className="scholarship-help"><h2>Cómo leer el estado</h2><p><strong>Abierta:</strong> la fuente consultada recibe solicitudes y publica una fecha de cierre futura.</p><p><strong>Próxima:</strong> hay un calendario anunciado y todavía no llega la apertura.</p><p><strong>Consultar vigencia:</strong> revisa la próxima convocatoria o el calendario de la institución.</p><p><strong>Cerrada:</strong> la fecha publicada ya pasó; puedes guardar el programa para consultar futuras convocatorias.</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
