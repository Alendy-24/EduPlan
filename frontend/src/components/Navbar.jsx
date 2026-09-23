import { useState } from "react";
import logoEduplan from "../assets/Images/logo-eduplan.jpg";

function Navbar({ currentPage }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="navbar">

            <a className="navbar-logo" href="#/" onClick={() => setMenuOpen(false)}>
                <img
                    src={logoEduplan}
                    alt="Logo de EduPlan"
                />

                <span>EduPlan</span>
            </a>

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
                <a href="#/instituciones" aria-current={currentPage === "instituciones" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Instituciones</a>
                <a href="#">Programas</a>
                <a href="#">Becas</a>
                <a href="#">Guías</a>
                <a href="#">Ayuda</a>
            </nav>

            <div className="navbar-actions">

                <button className="btn-signin">
                    Sign in
                </button>

                <button className="btn-register">
                    Regístrate
                </button>

            </div>

        </header>
    );
}

export default Navbar;
