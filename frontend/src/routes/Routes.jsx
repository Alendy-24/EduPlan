import { Route, Routes, Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Landing from '../pages/landing';
import Register from '../pages/register';
import AuthPage from '../pages/AuthPage';
import DashboardPage from '../pages/DashboardPage';
import InstitutionsPage from '../pages/InstitutionsPage';
import InstitutionDetailPage from '../pages/InstitutionDetailPage';
import ProgramsPage from '../pages/ProgramsPage';
import ProgramDetailPage from '../pages/ProgramDetailPage';
import ComparePage from '../pages/ComparePage';
import ScholarshipsPage from '../pages/ScholarshipsPage';
import ProfilePage from '../pages/ProfilePage';
import GuidesPage from '../pages/GuidesPage';
function Layout(){return <><Navbar/><Outlet/><Footer/></>}
function NotFound(){return <main className="page container"><h1>Página no encontrada</h1><p>La dirección que buscas no existe.</p><Link className="btn btn-primary" to="/">Volver al inicio</Link></main>}
export default function AppRoutes(){return <Routes><Route element={<Layout/>}><Route index element={<Landing/>}/><Route path="login" element={<AuthPage/>}/><Route path="register" element={<Register/>}/><Route path="dashboard" element={<DashboardPage/>}/><Route path="instituciones" element={<InstitutionsPage/>}/><Route path="instituciones/:institutionId" element={<InstitutionDetailPage/>}/><Route path="instituciones/:institutionId/programas" element={<ProgramsPage institutionOnly/>}/><Route path="programas" element={<ProgramsPage/>}/><Route path="programas/:programId" element={<ProgramDetailPage/>}/><Route path="comparar" element={<ComparePage/>}/><Route path="becas" element={<ScholarshipsPage/>}/><Route path="perfil" element={<ProfilePage/>}/><Route path="guias" element={<GuidesPage/>}/><Route path="*" element={<NotFound/>}/></Route></Routes>}
