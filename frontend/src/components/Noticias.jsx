import { useEffect, useState } from "react";
import "../styles/noticias.css";
import { Link } from "react-router-dom";

export default function Noticias() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch("http://localhost:8080/api/noticias")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("No se pudieron obtener las noticias");
                }

                return response.json();
            })
            .then((data) => {
                setNews(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error cargando noticias:", error);
                setError(true);
                setLoading(false);
            });
    }, []);

    const formatearFecha = (fecha) => {
        if (!fecha) return "";

        return new Date(fecha).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const limpiarDescripcion = (descripcion) => {
        if (!descripcion) return "";

        return descripcion
            .replace(/&#8230;/g, "...")
            .replace(/&#8216;/g, "'")
            .replace(/&#8217;/g, "'")
            .replace(/&nbsp;/g, " ");
    };

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

            {loading && (
                <p className="news-loading">
                    Cargando noticias...
                </p>
            )}

            {error && (
                <p className="news-error">
                    No pudimos cargar las noticias. Intenta nuevamente.
                </p>
            )}

            {!loading && !error && (
                <div className="news-grid">
                    {news.slice(0, 6).map((item, index) => (
                        <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="news-card"
                            key={item.link || index}
                        >
                            {/*
                                El RSS actual no nos está enviando
                                una imagen, así que por ahora usamos
                                una imagen de respaldo.
                            */}
                            <img
                                src={item.image || "/images/news-placeholder.jpg"}
                                alt={item.title}
                                className="news-image"
                            />

                            <div className="news-content">
                                <span className="news-university">
                                    {item.source}
                                </span>

                                <h3>{item.title}</h3>

                                <p>
                                    {limpiarDescripcion(item.description)}
                                </p>

                                <span className="news-date">
                                    {formatearFecha(item.publishedAt)}
                                </span>

                                <span className="news-read-more">
                                    Leer noticia →
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            )}

            <div className="news-button-container">
                <Link className="news-button" to="/noticias">
                    Ir a todas las noticias
                </Link>
            </div>
        </section>
    );
}