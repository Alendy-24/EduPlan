import chatIcon from "../assets/Images/chat.svg";

function Footer() {
    return (
        <footer className="footer">

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

        </footer>
    );
}

export default Footer;