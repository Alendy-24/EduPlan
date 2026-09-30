import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import RecommendationsSection from '../components/RecommendationsSection';
export default function RecommendationsPage() {
  return <main className="page"><div className="container"><PageHeader title="Tus recomendaciones">Explora programas reales según tus intereses, nivel, modalidad y ubicación.</PageHeader><p><Link to="/perfil" className="text-link">Editar mis preferencias →</Link></p><RecommendationsSection /></div></main>;
}
