import { useState } from 'react';
import { Link } from 'react-router-dom';
import DemoNotice from '../components/DemoNotice';
import { programs } from '../data/mock/catalog';
import './pages.css';

const initialPrograms=programs.slice(0,3);
const rows=[['Institución',p=>p.institution],['Programa',p=>p.name],['Ciudad',p=>p.city],['Duración',p=>p.duration],['Modalidad',p=>p.modality],['Costo',()=> 'Por confirmar con la institución'],['Enfoque',p=>p.description]];
export default function ComparePage(){
  const [comparison,setComparison]=useState(initialPrograms);
  return <main className="page"><div className="container"><Link className="back-link" to="/programas">← Volver a programas</Link><div className="page-intro"><h1>Comparar programas</h1><p className="lead">Revisa la información de cada opción lado a lado.</p></div><DemoNotice/><div className="results-line"><strong>{comparison.length} programas en la comparación</strong><div style={{display:'flex',gap:8}}><button className="btn btn-secondary" type="button" onClick={()=>setComparison(initialPrograms)}>Restablecer</button><button className="btn btn-secondary" type="button" onClick={()=>setComparison([])} disabled={!comparison.length}>Limpiar comparación</button></div></div>{comparison.length?<div className="compare-wrap" role="region" aria-label="Comparación de programas" tabIndex={0}><table className="compare-table"><thead><tr><th scope="col">Criterio</th>{comparison.map(p=><td key={p.id}><img src={p.image} alt="Espacio de estudio de referencia"/><strong>{p.name}</strong><small>{p.institution}</small><button className="text-link" style={{display:'block',marginTop:8,border:0,background:'none',padding:0}} type="button" onClick={()=>setComparison(items=>items.filter(item=>item.id!==p.id))}>Quitar</button></td>)}</tr></thead><tbody>{rows.map(([label,get])=><tr key={label}><th scope="row">{label}</th>{comparison.map(p=><td key={p.id}>{get(p)}</td>)}</tr>)}<tr><th scope="row">Ver más</th>{comparison.map(p=><td key={p.id}><Link className="btn btn-primary" to={`/programas/${p.id}`}>Ver programa</Link></td>)}</tr></tbody></table></div>:<div className="empty-state surface"><h2>Comparación vacía</h2><p>Restablece los programas de ejemplo o vuelve al listado.</p><button className="btn btn-primary" type="button" onClick={()=>setComparison(initialPrograms)}>Restablecer programas</button></div>}</div></main>;
}
