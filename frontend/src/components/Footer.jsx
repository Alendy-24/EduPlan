import { Link } from "react-router-dom";
import chatIcon from "../assets/Images/chat.svg";
export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="container footer-inner">
            <div className="footer-content">

                <p>
                    ¿Eres una organización o institución y quieres ser parte de nuestra misión?
                </p>

                <button className="contact-button">
                    Contáctanos!
                </button>

            </div>

            <div className="chat-button">
                <img src={chatIcon} alt="Ayuda" />
                <span>¿Necesitas ayuda?</span>
            </div>
                <span>
                    <strong>EduPlan</strong> · Información para elegir tu camino
                    académico.
                </span>
                <span>
                    <Link to="/dashboard">Panel de ejemplo</Link> ·{" "}
                    <Link to="/perfil">Mi perfil</Link> ·{" "}
                    <Link to="/guias">Guías</Link>
                </span>
            </div>
            <div className="container photo-credit">
                Foto Javeriana:{" "}
                <a
                    href="https://commons.wikimedia.org/wiki/File:2018_Bogot%C3%A1_-_Edificio_Gerardo_Arango_-_Facultad_de_Artes_-_Pontificia_Universidad_Javeriana.jpg"
                    target="_blank"
                    rel="noreferrer"
                >
                    Felipe Restrepo Acosta
                </a>{" "}
                ·{" "}
                <a
                    href="https://creativecommons.org/licenses/by-sa/4.0/"
                    target="_blank"
                    rel="noreferrer"
                >
                    CC BY-SA 4.0
                </a>
            </div>
        </footer>
    );
}