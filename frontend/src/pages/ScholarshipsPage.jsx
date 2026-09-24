import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DemoNotice from '../components/DemoNotice';
import BookmarkButton from '../components/BookmarkButton';
import { scholarships, students } from '../data/mock/catalog';
import './pages.css';

const types=['Todas','Beca','Crédito','Apoyo','Pasantía'];
export default function ScholarshipsPage(){
  const [type,setType]=useState('Todas');
  const [query,setQuery]=useState(()=>new URLSearchParams(window.location.search).get('q')||'');
  const [city,setCity]=useState(()=>new URLSearchParams(window.location.search).get('city')||'');
  const [level,setLevel]=useState(()=>new URLSearchParams(window.location.search).get('level')||'');
  const [order,setOrder]=useState('asc');
  const filtered=useMemo(()=>scholarships.filter(s=>
    (type==='Todas'||s.type===type)&&(!city||s.city===city)&&(!level||s.level===level)&&
    `${s.name} ${s.provider} ${s.description}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
  ).sort((a,b)=>order==='asc'?a.name.localeCompare(b.name,'es'):b.name.localeCompare(a.name,'es')),[type,query,city,level,order]);
  return <main><section className="hero" style={{minHeight:310}}><img className="hero-photo" src={students} alt="Estudiantes conversando sobre opciones de financiación"/><div className="container hero-content" style={{paddingTop:55,paddingBottom:75}}><span className="eyebrow">Tu futuro, con más oportunidades</span><h1>Becas y oportunidades</h1><p>Explora caminos de apoyo para tu educación en Colombia.</p></div></section><div className="container" style={{paddingBottom:70}}>
    <div className="filter-bar"><label className="field">Buscar<input type="search" placeholder="Becas, créditos o apoyos" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="field">Ciudad<select value={city} onChange={e=>setCity(e.target.value)}><option value="">Todas</option><option>Bogotá</option><option>Colombia</option></select></label><label className="field">Nivel<select value={level} onChange={e=>setLevel(e.target.value)}><option value="">Todos</option><option>Pregrado</option><option>Posgrado</option><option>Todos los niveles</option></select></label><label className="field">Ordenar<select value={order} onChange={e=>setOrder(e.target.value)}><option value="asc">Nombre A–Z</option><option value="desc">Nombre Z–A</option></select></label></div>
    <DemoNotice/><div className="category-tabs" aria-label="Tipo de oportunidad">{types.map(v=><button key={v} type="button" aria-pressed={type===v} onClick={()=>setType(v)}>{v}</button>)}</div>
    <div className="two-column"><div><div className="results-line"><strong>{filtered.length} oportunidades de ejemplo</strong></div><div className="listing">{filtered.map(item=><article className="list-item scholarship-item surface" key={item.id}><img src={item.image} alt="Imagen educativa de referencia"/><div><h3>{item.name}</h3><p>{item.description}</p><div className="metadata"><span>{item.type}</span><span>{item.level}</span><span>{item.city}</span></div><small className="subtle">{item.provider}</small></div><div className="list-actions"><BookmarkButton id={`opportunity-${item.id}`} label={item.name}/></div></article>)}</div>{filtered.length===0&&<div className="empty-state surface"><h2>Sin coincidencias</h2><p>Prueba otra búsqueda o cambia los filtros.</p></div>}</div>
    <aside><div className="cta-panel"><h3>Encuentra una oportunidad</h3><p>Revisa requisitos, fechas y condiciones en la convocatoria oficial antes de postularte.</p></div><h3 style={{margin:'25px 0 10px'}}>Recursos útiles</h3><div className="resource-list">{[['Cómo leer una convocatoria','/guias'],['Opciones de financiación','/guias'],['Preguntas frecuentes','/guias']].map(([title,path])=><Link className="surface" to={path} key={title}>{title} →</Link>)}</div></aside></div>
  </div></main>;
}
