import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useExploration } from '../contexts/ExplorationContext';
import { useProfileInterests } from '../hooks/useProfileInterests';
import PageHeader from '../components/PageHeader';
const actions = [['Explorar programas','/programas'],['Buscar instituciones','/instituciones'],['Ver becas','/becas'],['Recibir orientación','/guias']];
export default function DashboardPage() {
  const { user, persistent: sessionPersistent } = useAuth(); const { saved, removeSaved, persistent } = useExploration(); const { progress } = useProfileInterests();
  return <main className="page"><div className="container"><PageHeader title={`Hola, ${user.name}`}>¿Qué quieres explorar hoy?</PageHeader>{!sessionPersistent && <p role="status">La sesión no pudo guardarse en esta pestaña; necesitarás iniciar sesión al recargar.</p>}
    <section className="dashboard-section"><div className="dashboard-actions">{actions.map(([title,href])=><Link className="dashboard-action surface" key={href} to={href}><strong>{title} →</strong></Link>)}</div></section>
    <section className="dashboard-section"><h2>Tus guardados</h2><p className="subtle">En este dispositivo, asociados a tu cuenta. Los resúmenes no sustituyen la información actual de la fuente.</p>{!persistent && <p role="status">Los cambios permanecen solo durante esta visita.</p>}{saved.length ? <ul className="saved-list">{saved.map(item=><li key={item.id}><Link to={item.href}>{item.name}</Link><button type="button" className="text-link plain-button" aria-label={`Quitar ${item.name} de guardados`} onClick={()=>removeSaved(item.id)}>Quitar</button></li>)}</ul> : <p>Aún no has guardado opciones. Puedes hacerlo desde programas, instituciones o becas.</p>}</section>
    <section className="dashboard-section cta-panel"><h2>Completa tus intereses</h2><label htmlFor="interest-progress">Intereses completados: {progress} %</label><progress id="interest-progress" max="100" value={progress} /><p>Selecciona áreas y motivaciones para organizar tu exploración. Todavía no se generan recomendaciones.</p><Link className="btn btn-primary" to="/perfil">Ir a mi perfil</Link></section>
  </div></main>;
}
