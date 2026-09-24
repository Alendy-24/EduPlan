import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoEduplan from "../assets/Images/EduPlanLogo 1.svg";

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    function closeMenu() {
        setMenuOpen(false);
    }

    return (
        <header className="navbar">
            <Link className="navbar-logo" to="/" onClick={closeMenu}>
                <img src={logoEduplan} alt="Logo de EduPlan"/>
                <span>EduPlan</span>
            </Link>

            <button
                className="navbar-menu-toggle"
                type="button"
                aria-controls="navbar-links"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
            >
                Menú
            </button>

            <nav id="navbar-links" className={`navbar-links${menuOpen ? " is-open" : ""}`}>
                <Link
                    to="/instituciones"
                    aria-current={location.pathname === "/instituciones" ? "page" : undefined}
                    onClick={closeMenu}
                >
                    Instituciones
                </Link>
                <a href="#">Programas</a>
                <a href="#">Becas</a>
                <a href="#">Guías</a>
                <a href="#">Ayuda</a>
            </nav>

            <div className="navbar-actions">
                <button className="btn-signin" type="button" onClick={() => navigate("/signin")}>
                    Sign in
                </button>
                <button className="btn-register" type="button" onClick={() => navigate("/register")}>
                    Regístrate
                </button>
            </div>
        </header>
    );
}

export default Navbar;
