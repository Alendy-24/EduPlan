import { Link, useSearchParams } from 'react-router-dom';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { sufficientPreferences } from '../utils/preferences';
import SectionTabs from '../components/SectionTabs';
import AccountSettings from '../components/AccountSettings';
import AcademicPreferencesForm from '../components/AcademicPreferencesForm';
import OrientationPanel from '../components/profile/OrientationPanel';
import ProfileIcon from '../components/profile/ProfileIcon';

const sections = [['academico', 'Perfil académico'], ['orientacion', 'Orientación'], ['resultados', 'Resultados'], ['cuenta', 'Cuenta']];
export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  // Old profile/preferences/interests URLs open the integrated academic profile.
  const selected = sections.find(([key]) => key === params.get('seccion')) || sections[0];
  const academic = useAcademicProfile();
  const ready = academic.state === 'ready' && sufficientPreferences(academic.preferences, academic.interests);
  function changeTab(label) {
    const key = sections.find(([, text]) => text === label)[0];
    setParams(current => { const next = new URLSearchParams(current); if (key === 'academico') next.delete('seccion'); else next.set('seccion', key); return next; }, { replace: true });
  }
  return <main className="page profile-page profile-redesign"><div className="container profile-shell">
    <div className="profile-breadcrumb"><Link to="/dashboard">Mi espacio</Link><span aria-hidden="true">/</span><span>Mi perfil</span></div>
    <SectionTabs items={sections.map(([, label]) => label)} value={selected[1]} onChange={changeTab} label="Secciones del perfil">
      <div className="profile-tab-content">
        {selected[0] === 'academico' && <AcademicPreferencesForm/>}
        {selected[0] === 'orientacion' && <OrientationPanel/>}
        {selected[0] === 'resultados' && <section className="profile-results-card"><span className="results-icon"><ProfileIcon name="academic"/></span><p className="eyebrow">Tu próximo paso</p><h1>{ready ? 'Encuentra tu siguiente camino' : 'Tus opciones empiezan contigo'}</h1><p>{ready ? 'Explora programas a partir de tus intereses, nivel, ubicación y modalidad. Guarda los que te gusten y compáralos con calma.' : 'Elige un nivel de formación y un área de interés, y revisa tu ubicación. Con eso podemos empezar a buscar opciones para ti.'}</p><div className="profile-result-actions"><Link className="btn btn-primary" to={ready ? '/recomendaciones' : '/perfil'}>{ready ? 'Ver mis recomendaciones' : 'Completar perfil académico'}<ProfileIcon name="arrow"/></Link>{ready && <Link className="text-link" to="/perfil">Ajustar mi perfil</Link>}</div><p className="field-help">La compatibilidad es orientativa. Revisa los requisitos y la oferta vigente con cada institución.</p></section>}
        {selected[0] === 'cuenta' && <AccountSettings/>}
      </div>
    </SectionTabs>
  </div></main>;
}
