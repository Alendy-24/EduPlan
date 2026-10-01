import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export default function RequireAuth() { const { user } = useAuth(); const location = useLocation(); return user ? <Outlet /> : <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />; }
