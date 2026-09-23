import { useState } from "react";

function RegisterForm() {
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [mostrarContrasena, setMostrarContrasena] = useState(false);

    const manejarEnvio = (e) => {
        e.preventDefault();
        console.log({ nombre, correo, contrasena });
        // Aquí después va la llamada al backend de Spring Boot
    };

    return (
        <div className="register-card">
            <div className="register-header">
                <h1>Registrate</h1>
                <p>Empieza a planear tu futuro academico.</p>
            </div>

            <form onSubmit={manejarEnvio}>
                <div className="register-field">
                    <label>Nombres y apellidos</label>
                    <div className="register-input">
                        <span className="icon-placeholder">✉</span>
                        <input
                            type="text"
                            placeholder="tu.correo@ejemplo.com o usuario"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                    </div>
                </div>

                <div className="register-field">
                    <label>Correo o nombre de usuario</label>
                    <div className="register-input">
                        <span className="icon-placeholder">✉</span>
                        <input
                            type="email"
                            placeholder="tu.correo@ejemplo.com o usuario"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                        />
                    </div>
                </div>

                <div className="register-field">
                    <label>Contraseña</label>
                    <div className="register-input">
                        <span className="icon-placeholder">🔒</span>
                        <input
                            type={mostrarContrasena ? "text" : "password"}
                            placeholder="Crea una contraseña"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                        />
                        <button
                            type="button"
                            className="icon-placeholder icon-eye-btn"
                            onClick={() => setMostrarContrasena(!mostrarContrasena)}
                        >
                            👁
                        </button>
                    </div>
                </div>

                <button type="submit" className="btn-primary btn-block">
                    Crear Cuenta
                </button>
            </form>

            <div className="register-separator">
                <span></span>
                <p>o</p>
                <span></span>
            </div>

            <button className="btn-social">
                <span className="icon-placeholder">G</span> Continuar con Google
            </button>
            <button className="btn-social">
                <span className="icon-placeholder">▦</span> Continuar con Microsoft
            </button>

            <p className="register-login-row">
                ¿Ya tienes una cuenta? <a href="/login">Iniciar Sesión</a>
            </p>
        </div>
    );
}

export default RegisterForm;