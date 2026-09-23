import logoEduplan from "../assets/Images/logo-eduplan.jpg";

function Navbar() {
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

                <button className="btn-register">
                    Regístrate
                </button>

            </div>

        </header>
    );
}

export default Navbar;
