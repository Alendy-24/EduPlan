import news from "../data/news";
import "../styles/noticias.css";
import { Link } from "react-router-dom";

export default function Noticias() {
    return (
        <section className="news-section">
            <div className="section-heading news-heading">
                <div>
                    <h2>Noticias</h2>
                    <p>
                        Mantente informado sobre oportunidades, programas y
                        novedades de las universidades.
                    </p>
                </div>
            </div>

            <div className="news-grid">
                {news.map((item) => (
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-card"
                        key={item.id}
                    >
                        <img
                            src={item.image}
                            alt={item.title}
                            className="news-image"
                        />

                        <div className="news-content">
                            <span className="news-university">
                                {item.university}
                            </span>

                            <h3>{item.title}</h3>

                            <p>{item.description}</p>

                            <span className="news-date">
                                {item.date}
                            </span>

                            <span className="news-read-more">
                                Leer noticia →
                            </span>
                        </div>
                    </a>
                ))}
            </div>

            <div className="news-button-container">
                <Link className="news-button" to="/noticias">
                    Ir a todas las noticias
                </Link>
            </div>
        </section>
    );
}