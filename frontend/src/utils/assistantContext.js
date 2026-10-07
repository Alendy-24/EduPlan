import { matchPath } from 'react-router-dom';

// (deben coincidir con AppRoutes)
const PANTALLAS = [
  { patron: '/', id: 'inicio' },
  { patron: '/login', id: 'login' },
  { patron: '/register', id: 'registro' },
  { patron: '/dashboard', id: 'dashboard' },
  { patron: '/perfil', id: 'perfil' },
  { patron: '/recomendaciones', id: 'recomendaciones' },
  { patron: '/instituciones', id: 'instituciones' },
  { patron: '/instituciones/:institutionId', id: 'institucion-detalle' },
  { patron: '/instituciones/:institutionId/programas', id: 'institucion-programas' },
  { patron: '/programas', id: 'programas' },
  { patron: '/programas/:programId', id: 'programa-detalle' },
  { patron: '/comparar', id: 'comparar' },
  { patron: '/becas', id: 'becas' },
  { patron: '/guias', id: 'guias' },
  { patron: '/noticias', id: 'noticias' },
];

// Devuelve la pantalla actual y los parámetros dinámicos de la URL (ids)
export function contextoDePantalla(pathname) {
  for (const { patron, id } of PANTALLAS) {
    const coincidencia = matchPath({ path: patron, end: true }, pathname);
    if (coincidencia) return { pantalla: id, params: coincidencia.params };
  }
  return { pantalla: 'desconocida', params: {} };
}