import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Estilos globales (el orden importa: base y layout primero)
import './styles/base.css'
import './styles/layout.css'

// Estilos por página
import './styles/home.css'
import './styles/auth.css'
import './styles/listados.css'
import './styles/detalle.css'
import './styles/recursos.css'
import './styles/comparador.css'
import './styles/dashboard.css'
import './styles/perfil.css'
import './styles/instituciones.css'
import './styles/product.css'
import './styles/authenticated.css'
import './styles/recommendations.css'
import './styles/authenticated-polish.css'
import './styles/profile-redesign.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
