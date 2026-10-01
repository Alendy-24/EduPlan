import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import RecommendationsSection from '../components/RecommendationsSection';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { sufficientPreferences } from '../utils/preferences';
export default function RecommendationsPage() {
  const profile = useAcademicProfile();
  const ready = profile.state === 'ready' && sufficientPreferences(profile.preferences, profile.interests, profile.refinement);
  return <main className="page recommendations-page"><div className="container"><PageHeader title={ready ? 'Tus recomendaciones' : 'Construye tus recomendaciones'}>{ready ? 'Explora programas verificados según tus intereses, nivel, modalidad y ubicación.' : 'Completa lo esencial de tu perfil para descubrir opciones afines a ti.'}</PageHeader><p><Link to="/perfil" className="text-link">{ready ? 'Ajustar mi perfil' : 'Completar mi perfil'} →</Link></p><RecommendationsSection /></div></main>;
}
