import { useEffect, useState } from "react";
import "../styles/noticias.css";

export default function NoticiasPage() {
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

    return (
        <main className="news-page">
            <div className="container">

                <div className="news-page-heading">
                    <h1>Noticias</h1>

                    <p>
                        Explora las últimas noticias, oportunidades y novedades
                        de las universidades.
                    </p>
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
                    <div className="news-page-grid">

                        {news.map((item, index) => (
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="news-page-card"
                                key={item.link || index}
                            >
                                <img
                                    src={
                                        item.image ||
                                        "/images/news-placeholder.jpg"
                                    }
                                    alt={item.title}
                                />

                                <div className="news-page-content">

                                    <span className="news-university">
                                        {item.source}
                                    </span>

                                    <h2>{item.title}</h2>

                                    <p>{item.description}</p>

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

            </div>
        </main>
    );
}