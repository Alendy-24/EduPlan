import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfileInterests, areas, motivations } from '../hooks/useProfileInterests';
import SectionTabs from '../components/SectionTabs';
import PageHeader from '../components/PageHeader';
const tabs = ['Perfil','Mis intereses','Resultados','Configuración'];
export default function ProfilePage() {
  const [tab,setTab] = useState('Mis intereses'); const { user, logout } = useAuth(); const { selections,toggle,save,message,progress } = useProfileInterests();
  return <main className="page"><div className="container"><PageHeader title="Mi perfil">Organiza tus intereses para preparar tu exploración.</PageHeader><SectionTabs items={tabs} value={tab} onChange={setTab} label="Secciones del perfil">
    {tab === 'Mis intereses' ? <><p className="subtle">Intereses guardados en este dispositivo para tu cuenta. No se sincronizan con otros dispositivos.</p><p>Intereses completados: {progress} %</p>{[['areas','Áreas que te interesan',areas],['motivations','¿Qué te motiva?',motivations]].map(([group,title,values])=><section className="profile-panel surface" key={group}><h2>{title}</h2><div className="choice-grid">{values.map(value=><button className="choice" type="button" key={value} aria-pressed={selections[group].includes(value)} onClick={()=>toggle(group,value)}>{value}</button>)}</div></section>)}<button className="btn btn-primary" type="button" onClick={save}>Guardar intereses</button>{message && <p role="status">{message}</p>}</>
    : tab === 'Perfil' ? <section className="profile-panel"><h2>Datos de tu cuenta</h2><dl><dt>Nombre</dt><dd>{user.name}</dd><dt>Correo</dt><dd>{user.email}</dd></dl><p>La edición de datos de cuenta estará disponible en una etapa posterior.</p></section>
    : tab === 'Resultados' ? <section className="profile-panel"><h2>Orientación</h2><p>Tus intereses preparan información para una futura orientación. Todavía no hay resultados ni recomendaciones automáticas.</p><Link className="btn btn-secondary" to="/guias">Leer guías</Link></section>
    : <section className="profile-panel"><h2>Configuración</h2><p>La sesión se conserva en esta pestaña hasta que venza. Cerrar sesión no elimina tus guardados locales.</p><button className="btn btn-secondary" type="button" onClick={logout}>Cerrar sesión</button></section>}
  </SectionTabs></div></main>;
}
