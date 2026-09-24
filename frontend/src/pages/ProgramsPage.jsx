import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DemoNotice from '../components/DemoNotice';
import ProgramCard from '../components/ProgramCard';
import { demoInstitution, programs } from '../data/mock/catalog';
import './pages.css';

export default function ProgramsPage({ institutionOnly = false }) {
  const { institutionId } = useParams();
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [city, setCity] = useState(() => new URLSearchParams(window.location.search).get('city') || '');
  const [level, setLevel] = useState(() => new URLSearchParams(window.location.search).get('level') || 'Todos');
  const [area, setArea] = useState('');
  const [modality, setModality] = useState('');
  const [order, setOrder] = useState('asc');
  const isDemo = institutionId === demoInstitution.id;
  const filtered = useMemo(() => programs.filter(p =>
    (level === 'Todos' || p.level === level) &&
    (!city || p.city === city) &&
    (!area || p.area === area) &&
    (!modality || p.modality === modality) &&
    `${p.name} ${p.description} ${p.area}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
  ).sort((a,b) => order === 'asc' ? a.name.localeCompare(b.name, 'es') : b.name.localeCompare(a.name, 'es')),
  [query, city, level, area, modality, order]);

  return <main className="page"><div className="container">
    {institutionOnly && <Link className="back-link" to={`/instituciones/${institutionId}`}>← Volver a la institución</Link>}
    <div className="page-intro"><span className="eyebrow">Explora tus opciones</span><h1>Programas académicos</h1><p className="lead">{institutionOnly ? `Explora la vista de programas de ${isDemo ? demoInstitution.name : 'esta institución'}.` : 'Busca áreas de estudio y conoce qué preguntas hacer antes de elegir.'}</p></div>
    <DemoNotice/>
    {institutionOnly && !isDemo ? <div className="empty-state surface"><h2>Programas aún no disponibles</h2><p>La lista de programas de esta institución todavía no está conectada a datos reales.</p><Link className="btn btn-secondary" to="/programas">Ver la vista de ejemplo</Link></div> : <>
      <div className="filter-bar"><label className="field">Buscar programas<input type="search" placeholder="Nombre, tema o área" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="field">Ciudad<select value={city} onChange={e=>setCity(e.target.value)}><option value="">Todas</option><option>Bogotá</option><option>Medellín</option><option>Cali</option></select></label><label className="field">Área<select value={area} onChange={e=>setArea(e.target.value)}><option value="">Todas las áreas</option>{[...new Set(programs.map(p=>p.area))].map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Modalidad<select value={modality} onChange={e=>setModality(e.target.value)}><option value="">Todas</option>{[...new Set(programs.map(p=>p.modality))].map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Ordenar<select value={order} onChange={e=>setOrder(e.target.value)}><option value="asc">Nombre A–Z</option><option value="desc">Nombre Z–A</option></select></label></div>
      <div className="category-tabs" aria-label="Nivel de estudio">{['Todos','Pregrado','Posgrado'].map(v=><button key={v} type="button" aria-pressed={level===v} onClick={()=>setLevel(v)}>{v}</button>)}</div>
      <div className="results-line"><strong>{filtered.length} {filtered.length===1?'programa':'programas'} en esta vista</strong><Link className="text-link" to="/comparar">Comparar opciones →</Link></div>
      <div className="listing">{filtered.map(p=><ProgramCard key={p.id} program={p}/>)}</div>
      {filtered.length===0 && <div className="empty-state surface"><h2>Sin coincidencias</h2><p>Prueba otro término o ajusta los filtros.</p></div>}
    </>}
  </div></main>;
}
