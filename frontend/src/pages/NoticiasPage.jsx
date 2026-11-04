import { useEffect, useMemo, useState } from "react";
import "../styles/noticias.css";

const CATEGORIAS = [
    "Becas y financiación",
    "Ciencia y tecnología",
    "Ferias y eventos",
    "Investigación",
    "Convocatorias y oportunidades",
    "Vida universitaria",
    "Otras noticias",
];

const REGLAS_CATEGORIAS = {
    "Becas y financiación":
        /\b(beca|becas|becario|becaria|financiaci[oó]n|matr[ií]cula|auxilio econ[oó]mico)\b/i,

    "Ciencia y tecnología":
        /\b(tecnolog[ií]a|inteligencia artificial|innovaci[oó]n|software|rob[oó]tica|digital|ciencia|cient[ií]fico)\b/i,

    "Ferias y eventos":
        /\b(feria|ferias|evento|eventos|congreso|congresos|seminario|seminarios|conferencia|conferencias|festival|encuentro|encuentros|jornada|jornadas|exposici[oó]n)\b/i,

    "Investigación":
        /\b(investigaci[oó]n|investigador|investigadora|investigadores|estudio|estudios|proyecto de investigaci[oó]n|publicaci[oó]n cient[ií]fica)\b/i,

    "Convocatorias y oportunidades":
        /\b(convocatoria|convocatorias|inscripciones|inscripci[oó]n|admisiones|admisi[oó]n|postulaci[oó]n|postular|oportunidad|oportunidades|curso|cursos|diplomado|diplomados)\b/i,

    "Vida universitaria":
        /\b(estudiantes|estudiantil|graduados|egresados|bienestar|deportes|cultura|campus|comunidad universitaria|vida universitaria)\b/i,
};

function obtenerCategorias(noticia) {
    const texto = `${noticia.title || ""} ${noticia.description || ""}`;

    const encontradas = CATEGORIAS.filter((categoria) => {
        if (categoria === "Otras noticias") {
            return false;
        }

        return REGLAS_CATEGORIAS[categoria].test(texto);
    });

    return encontradas.length > 0
        ? encontradas
        : ["Otras noticias"];
}

function normalizarTexto(texto = "") {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es");
}

function obtenerFecha(fecha) {
    if (!fecha) return null;

    const fechaConvertida = new Date(fecha);

    return Number.isNaN(fechaConvertida.getTime())
        ? null
        : fechaConvertida;
}

export default function NoticiasPage() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [busqueda, setBusqueda] = useState("");
    const [universidad, setUniversidad] = useState("Todas");
    const [categoria, setCategoria] = useState("Todas");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [orden, setOrden] = useState("recientes");

    useEffect(() => {
        fetch("http://localhost:8080/api/noticias")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("No se pudieron obtener las noticias");
                }

                return response.json();
            })
            .then((data) => {
                setNews(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error cargando noticias:", error);
                setError(true);
                setLoading(false);
            });
    }, []);

    const universidades = useMemo(() => {
        return [
            ...new Set(
                news
                    .map((item) => item.source)
                    .filter(Boolean)
            ),
        ].sort((a, b) => a.localeCompare(b, "es"));
    }, [news]);

    const noticiasClasificadas = useMemo(() => {
        return news.map((item) => ({
            ...item,
            categorias: obtenerCategorias(item),
        }));
    }, [news]);

    const noticiasFiltradas = useMemo(() => {
        let resultado = [...noticiasClasificadas];

        // Buscar por título o descripción
        if (busqueda.trim()) {
            const termino = normalizarTexto(busqueda.trim());

            resultado = resultado.filter((item) => {
                const titulo = normalizarTexto(item.title);
                const descripcion = normalizarTexto(item.description);

                return (
                    titulo.includes(termino) ||
                    descripcion.includes(termino)
                );
            });
        }

        // Filtrar por universidad
        if (universidad !== "Todas") {
            resultado = resultado.filter(
                (item) => item.source === universidad
            );
        }

        // Filtrar por categoría
        if (categoria !== "Todas") {
            resultado = resultado.filter(
                (item) => item.categorias.includes(categoria)
            );
        }

        // Filtrar por fechas
        // Las noticias sin fecha no se incluyen cuando
        // se establece un rango de fechas.
        if (fechaDesde || fechaHasta) {
            resultado = resultado.filter((item) => {
                const fecha = obtenerFecha(item.publishedAt);

                if (!fecha) return false;

                const diaNoticia = new Date(
                    fecha.getFullYear(),
                    fecha.getMonth(),
                    fecha.getDate()
                ).getTime();

                if (fechaDesde) {
                    const inicio = new Date(
                        `${fechaDesde}T00:00:00`
                    ).getTime();

                    if (diaNoticia < inicio) return false;
                }

                if (fechaHasta) {
                    const fin = new Date(
                        `${fechaHasta}T00:00:00`
                    ).getTime();

                    if (diaNoticia > fin) return false;
                }

                return true;
            });
        }

        // Ordenar resultados
        resultado.sort((a, b) => {
            if (orden === "az" || orden === "za") {
                const comparacion = (a.title || "").localeCompare(
                    b.title || "",
                    "es",
                    { sensitivity: "base" }
                );

                return orden === "az"
                    ? comparacion
                    : -comparacion;
            }

            const fechaA = obtenerFecha(a.publishedAt);
            const fechaB = obtenerFecha(b.publishedAt);

            // Las noticias sin fecha van al final
            if (!fechaA && !fechaB) return 0;
            if (!fechaA) return 1;
            if (!fechaB) return -1;

            return orden === "recientes"
                ? fechaB.getTime() - fechaA.getTime()
                : fechaA.getTime() - fechaB.getTime();
        });

        return resultado;
    }, [
        noticiasClasificadas,
        busqueda,
        universidad,
        categoria,
        fechaDesde,
        fechaHasta,
        orden,
    ]);

    const formatearFecha = (fecha) => {
        const fechaConvertida = obtenerFecha(fecha);

        if (!fechaConvertida) return "Fecha no disponible";

        return fechaConvertida.toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const limpiarFiltros = () => {
        setBusqueda("");
        setUniversidad("Todas");
        setCategoria("Todas");
        setFechaDesde("");
        setFechaHasta("");
        setOrden("recientes");
    };

    return (
        <main className="news-page">
            <div className="container">
                <div className="news-page-heading">
                    <h1>Noticias</h1>

                    <p>
                        Explora las últimas noticias, oportunidades y
                        novedades de las universidades.
                    </p>
                </div>

                {!loading && !error && (
                    <section
                        className="news-filters"
                        aria-label="Filtros de noticias"
                    >
                        <div className="news-filter-search">
                            <label htmlFor="news-search">
                                Buscar noticias
                            </label>

                            <input
                                id="news-search"
                                type="search"
                                placeholder="Escribe un título o palabra clave..."
                                value={busqueda}
                                onChange={(e) =>
                                    setBusqueda(e.target.value)
                                }
                            />
                        </div>

                        <div className="news-filters-grid">
                            <div className="news-filter-field">
                                <label htmlFor="news-university">
                                    Universidad
                                </label>

                                <select
                                    id="news-university"
                                    value={universidad}
                                    onChange={(e) =>
                                        setUniversidad(e.target.value)
                                    }
                                >
                                    <option value="Todas">
                                        Todas las universidades
                                    </option>

                                    {universidades.map((nombre) => (
                                        <option
                                            key={nombre}
                                            value={nombre}
                                        >
                                            {nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="news-filter-field">
                                <label htmlFor="news-category">
                                    Categoría
                                </label>

                                <select
                                    id="news-category"
                                    value={categoria}
                                    onChange={(e) =>
                                        setCategoria(e.target.value)
                                    }
                                >
                                    <option value="Todas">
                                        Todas las categorías
                                    </option>

                                    {CATEGORIAS.map((nombre) => (
                                        <option
                                            key={nombre}
                                            value={nombre}
                                        >
                                            {nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="news-filter-field">
                                <label htmlFor="news-from">
                                    Desde
                                </label>

                                <input
                                    id="news-from"
                                    type="date"
                                    max={fechaHasta || undefined}
                                    value={fechaDesde}
                                    onChange={(e) =>
                                        setFechaDesde(e.target.value)
                                    }
                                />
                            </div>

                            <div className="news-filter-field">
                                <label htmlFor="news-to">
                                    Hasta
                                </label>

                                <input
                                    id="news-to"
                                    type="date"
                                    min={fechaDesde || undefined}
                                    value={fechaHasta}
                                    onChange={(e) =>
                                        setFechaHasta(e.target.value)
                                    }
                                />
                            </div>

                            <div className="news-filter-field">
                                <label htmlFor="news-sort">
                                    Ordenar por
                                </label>

                                <select
                                    id="news-sort"
                                    value={orden}
                                    onChange={(e) =>
                                        setOrden(e.target.value)
                                    }
                                >
                                    <option value="recientes">
                                        Más recientes
                                    </option>

                                    <option value="antiguas">
                                        Más antiguas
                                    </option>

                                    <option value="az">
                                        Título A-Z
                                    </option>

                                    <option value="za">
                                        Título Z-A
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div className="news-filter-footer">
                            <p aria-live="polite">
                                {noticiasFiltradas.length}{" "}
                                {noticiasFiltradas.length === 1
                                    ? "noticia encontrada"
                                    : "noticias encontradas"}
                            </p>

                            <button
                                type="button"
                                className="news-clear-filters"
                                onClick={limpiarFiltros}
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </section>
                )}

                {loading && (
                    <p className="news-loading">
                        Cargando noticias...
                    </p>
                )}

                {error && (
                    <div className="news-error">
                        <p>
                            No pudimos cargar las noticias.
                            Intenta nuevamente.
                        </p>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {noticiasFiltradas.length > 0 ? (
                            <div className="news-page-grid">
                                {noticiasFiltradas.map((item, index) => (
                                    <a
                                        href={item.link || undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="news-page-card"
                                        key={
                                            item.link ||
                                            `${item.title}-${index}`
                                        }
                                        onClick={(e) => {
                                            if (!item.link) {
                                                e.preventDefault();
                                            }
                                        }}
                                    >
                                        <img
                                            src={
                                                item.image ||
                                                "/images/news-placeholder.jpg"
                                            }
                                            alt={item.title || "Noticia"}
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src =
                                                    "/images/news-placeholder.jpg";
                                            }}
                                        />

                                        <div className="news-page-content">
                                            <span className="news-university">
                                                {item.source}
                                            </span>

                                            <div className="news-category-tags">
                                                {item.categorias.map(
                                                    (nombre) => (
                                                        <span
                                                            key={nombre}
                                                            className="news-category-tag"
                                                        >
                                                            {nombre}
                                                        </span>
                                                    )
                                                )}
                                            </div>

                                            <h2>
                                                {item.title ||
                                                    "Noticia sin título"}
                                            </h2>

                                            <p>
                                                {item.description ||
                                                    "No hay descripción disponible."}
                                            </p>

                                            <span className="news-date">
                                                {formatearFecha(
                                                    item.publishedAt
                                                )}
                                            </span>

                                            <span className="news-read-more">
                                                {item.link
                                                    ? "Leer noticia →"
                                                    : "Enlace no disponible"}
                                            </span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="news-empty">
                                <h2>No encontramos noticias</h2>

                                <p>
                                    Intenta cambiar los filtros o buscar
                                    con otras palabras.
                                </p>

                                <button
                                    type="button"
                                    className="news-clear-filters"
                                    onClick={limpiarFiltros}
                                >
                                    Ver todas las noticias
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
