import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoEduplan from "../assets/Images/EduPlanLogo.svg";

const links = [
    ["Instituciones", "/instituciones"],
    ["Programas", "/programas"],
    ["Becas", "/becas"],
    ["Guías", "/guias"],
    ["Ayuda", "/ayuda"],
];

function Navbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
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
                    <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        Iniciar Sesión
                    </button>
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