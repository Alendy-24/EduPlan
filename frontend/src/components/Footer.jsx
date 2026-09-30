import { Link } from 'react-router-dom';
import { ChatIcon } from './Assistant';
export default function Footer({ onOpenAssistant }) {
  return <footer className="site-footer"><div className="container footer-grid">
    <div className="footer-brand"><Link to="/">EduPlan</Link><p>Información para elegir<br />tu camino académico.</p></div>
    <nav aria-label="Explorar en EduPlan"><h2>Explorar</h2><Link to="/instituciones">Instituciones</Link><Link to="/programas">Programas</Link><Link to="/becas">Becas</Link><Link to="/guias">Guías</Link></nav>
    <nav aria-label="Tu espacio"><h2>Tu espacio</h2><Link to="/dashboard">Mi espacio</Link><Link to="/perfil">Mi perfil</Link></nav>
    <div className="footer-assistant"><h2>Asistente</h2><button className="footer-assistant-button" type="button" onClick={onOpenAssistant}><ChatIcon /> Asistente EduPlan</button><p>Próximamente</p></div>
  </div><div className="container footer-bottom"><p>© EduPlan <span>Información educativa basada en fuentes públicas.</span></p><p className="photo-credit">Foto Javeriana: <a href="https://commons.wikimedia.org/wiki/File:2018_Bogot%C3%A1_-_Edificio_Gerardo_Arango_-_Facultad_de_Artes_-_Pontificia_Universidad_Javeriana.jpg" target="_blank" rel="noopener noreferrer">Felipe Restrepo Acosta</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p></div></footer>;
}
