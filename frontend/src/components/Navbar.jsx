import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logoEduplan from "../assets/Images/EduPlanLogo.svg";

const links = [
    ["Instituciones", "/instituciones"],
    ["Programas", "/programas"],
    ["Becas", "/becas"],
    ["Guías", "/guias"],
];

function Navbar() {
    const [open, setOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();

    function closeMenu() {
        setOpen(false);
    }

    return (
        <header className="site-header">
            <div className="container header-inner">
                <Link className="brand" to="/" onClick={closeMenu}>
                    <img src={logoEduplan} alt="Logo de EduPlan" />
                    <div>EduPlan</div>
                </Link>

                <nav
                    id="site-navigation"
                    className={`site-nav${open ? " is-open" : ""}`}
                    aria-label="Navegación principal"
                >
                    {links.map(([label, path]) => (
                        <Link
                            key={path}
                            to={path}
                            aria-current={location.pathname.startsWith(path) ? "page" : undefined}
                            onClick={closeMenu}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="header-actions">
                    {user ? <><Link className="account-link" to="/dashboard" onClick={closeMenu}>Mi espacio</Link><Link className="account-link" to="/perfil" onClick={closeMenu}>Perfil</Link><button className="text-link plain-button" type="button" onClick={() => { closeMenu(); logout(); }}>Salir</button></> : <Link className="btn btn-primary" to="/login" onClick={closeMenu}>Iniciar sesión</Link>}
                </div>

                <button
                    className="menu-toggle"
                    type="button"
                    aria-expanded={open}
                    aria-controls="site-navigation"
                    onClick={() => setOpen(!open)}
                >
                    {open ? "Cerrar" : "Menú"}
                </button>
            </div>
        </header>
    );
}

export default Navbar;
