import { Link } from 'react-router-dom';
import { ChatIcon } from './Assistant';
import { logoDevToken } from '../utils/institution-logos';
export default function Footer({ onOpenAssistant }) {
  return <footer className="site-footer"><div className="container footer-grid">
    <div className="footer-brand"><Link to="/">EduPlan</Link><p>Información para elegir<br />tu camino académico.</p></div>
    <nav aria-label="Explorar en EduPlan"><h2>Explorar</h2><Link to="/instituciones">Instituciones</Link><Link to="/programas">Programas</Link><Link to="/becas">Becas</Link><Link to="/guias">Guías</Link></nav>
    <nav aria-label="Tu espacio"><h2>Tu espacio</h2><Link to="/dashboard">Mi espacio</Link><Link to="/perfil">Mi perfil</Link></nav>
    <div className="footer-assistant"><h2>Asistente</h2><button className="footer-assistant-button" type="button" onClick={onOpenAssistant}><ChatIcon /> Asistente EduPlan</button><p>Próximamente</p></div>
  </div><div className="container footer-bottom"><p>© EduPlan <span>Información educativa basada en fuentes públicas.</span></p>{logoDevToken && <p className="photo-credit"><a href="https://www.logo.dev" target="_blank" rel="noopener noreferrer">Logos proporcionados por Logo.dev</a></p>}</div></footer>;
}
