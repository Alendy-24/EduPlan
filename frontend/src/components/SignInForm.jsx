import { useState } from "react";

function RegisterForm() {
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [mostrarContrasena, setMostrarContrasena] = useState(false);

    const manejarEnvio = (e) => {
        e.preventDefault();
        console.log({ correo, contrasena });
        // Aquí después va la llamada al backend de Spring Boot
    };

    return (
        <div className="register-card">
            <div className="register-header">
                <h1>Iniciar sesión</h1>
                <p>Ingresa para hacer seguimiento a tus oportunidades</p>
            </div>

            <form onSubmit={manejarEnvio}>
                <div className="register-field">
                    <label>Correo o telefono</label>
                    <div className="register-input">
                        <span className="icon-placeholder">✉</span>
                        <input
                            type="email"
                            placeholder="tu.correo@ejemplo.com o telefono"
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
                    Iniciar sesión
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
                ¿No tienes una cuenta? <a href="/register">Registrate</a>
            </p>
        </div>
    );
}

export default RegisterForm;
