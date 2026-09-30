import news from "../data/news";
import "../styles/noticias.css";

export default function NoticiasPage() {
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

                <div className="news-page-grid">
                    {news.map((item) => (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="news-page-card"
                            key={item.id}
                        >
                            <img
                                src={item.image}
                                alt={item.title}
                            />

                            <div className="news-page-content">
                                <span className="news-university">
                                    {item.university}
                                </span>

                                <h2>{item.title}</h2>

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
            </div>
        </main>
    );
}