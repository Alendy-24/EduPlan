import logoEduplan from "../assets/images/logo-eduplan.jpg";
import { useNavigate } from "react-router-dom";

function Navbar() {
     const navigate = useNavigate();
    return (
        <header className="navbar">

            <div className="navbar-logo">
                <img
                    src={logoEduplan}
                    alt="Logo de EduPlan"
                />

                <span>EduPlan</span>
            </div>

            <nav className="navbar-links">
                <a href="#">Instituciones</a>
                <a href="#">Programas</a>
                <a href="#">Becas</a>
                <a href="#">Guías</a>
                <a href="#">Ayuda</a>
            </nav>

            <div className="navbar-actions">

                <button className="btn-signin">
                    Sign in
                </button>

                <button className="btn-register"
                    onClick={() => navigate("/register")} >
                    Regístrate
                </button>

            </div>

        </header>
    );
}

export default Navbar;