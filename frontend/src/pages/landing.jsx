import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import students from "../assets/Images/estudiantess.avif";
import institutionIcon from "../assets/Images/instituciones.svg";
import programIcon from "../assets/Images/explorar-programas.svg";
import scholarshipIcon from "../assets/Images/becas.svg";
import guideIcon from "../assets/Images/guia.svg";
import PerfilamientoIcon from "../assets/Images/perfilamiento.svg";
import OrientacionIcon from "../assets/Images/orientacion.svg";
import { featuredOpportunities } from "../data/mock/catalog";

const categories = [
    [
        "Ver instituciones",
        "/instituciones",
        institutionIcon,
        "Conoce universidades e instituciones en Colombia.",
    ],
    [
        "Explorar programas",
        "/programas",
        programIcon,
        "Encuentra áreas de estudio según tus intereses.",
    ],
    [
        "Becas y financiación",
        "/becas",
        scholarshipIcon,
        "Conoce opciones de apoyo y financiación.",
    ],
    [
        "Guías y recursos",
        "/guias",
        guideIcon,
        "Informáte con contenido relevante para tu camino académico.",
    ],
    [
        "Perfilamiento",
        "/",
        PerfilamientoIcon,
        "Encuentra las oportunidades que mejor se ajusten a tu perfil.",
    ],
    [
        "Orientación personzalizada",
        "/",
        OrientacionIcon,
        "Recibe asesoría de expertos en educación superior.",
    ],
];
const searchTypes = [
    ["programas", "Buscar programas"],
    ["instituciones", "Buscar instituciones"],
    ["becas", "Buscar becas"],
];
const steps = [
    ["Busca", "Explora programas, instituciones y becas."],
    ["Compara", "Revisa opciones lado a lado."],
    ["Infórmate", "Consulta requisitos y recursos."],
    ["Decide", "Elige tus siguientes pasos con claridad."],
];

export default function Landing() {
    const [type, setType] = useState("programas");
    const [query, setQuery] = useState("");
    const [city, setCity] = useState("");
    const [level, setLevel] = useState("");
    const navigate = useNavigate();
    function search(event) {
        event.preventDefault();
        const path =
            type === "instituciones"
                ? "/instituciones"
                : type === "becas"
                  ? "/becas"
                  : "/programas";
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (city) params.set("city", city);
        if (level)
            params.set(
                type === "instituciones" ? "academicCharacter" : "level",
                level,
            );
        navigate(`${path}${params.size ? `?${params}` : ""}`);
    }
    function changeType(value) {
        setType(value);
        setLevel("");
    }
    return (
        <main>
            <section className="hero">
                <img
                    className="hero-photo"
                    src={students}
                    alt="Estudiantes conversan sobre sus opciones académicas"
                />
                <div className="container hero-content">
                    <span className="eyebrow">
                        Tu futuro, con más información
                    </span>
                    <h1>Construye tu futuro.</h1>
                    <p>
                        Te guiamos en tu camino a la educación superior.
                    </p>
                    <div className="hero-btns">
                        <button className="btn btn-primary" onClick={() => navigate("/login")}>
                            Encuentra mi oportunidad
                        </button>
                    </div>
                </div>
            </section>
          
           <div className="container">

        {/* 
                <form className="hero-search" role="search" onSubmit={search}>
                    <div
                        className="tabs"
                        role="tablist"
                        aria-label="Tipo de búsqueda"
                    >
                        {searchTypes.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className="tab"
                                role="tab"
                                aria-selected={type === value}
                                onClick={() => changeType(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="search-grid">
                        <label className="field">
                            <span className="sr-only">Término de búsqueda</span>
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={
                                    type === "instituciones"
                                        ? "Nombre de institución"
                                        : type === "becas"
                                          ? "Beca, crédito o apoyo"
                                          : "¿Qué quieres estudiar?"
                                }
                            />
                        </label>
                        <label className="field">
                            <span className="sr-only">Ciudad</span>
                            <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            >
                                <option value="">Toda Colombia</option>
                                <option>Bogotá</option>
                                <option>Medellín</option>
                            </select>                                <option>Cali</option>

                        </label>
                        <label className="field">
                            <span className="sr-only">
                                {type === "instituciones"
                                    ? "Tipo de institución"
                                    : "Nivel de estudio"}
                            </span>
                            <select
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                            >
                                {type === "instituciones" ? (
                                    <>
                                        <option value="">
                                            Todos los tipos
                                        </option>
                                        <option>Universidad</option>
                                        <option>
                                            Institución Universitaria/Escuela
                                            Tecnológica
                                        </option>
                                        <option>Institución Tecnológica</option>
                                        <option>
                                            Institución Técnica Profesional
                                        </option>
                                    </>
                                ) : (
                                    <>
                                        <option value="">
                                            Todos los niveles
                                        </option>
                                        <option>Pregrado</option>
                                        <option>Posgrado</option>
                                    </>
                                )}
                            </select>
                        </label>
                        <button className="btn btn-primary">Buscar</button>
                    </div>
                </form> */}
                <div className="cuadros-link">
                    {categories.map(([title, path, icon, description]) => (
                        <Link className="cuadro" to={path} key={title}>
                            <span className="cuadro-icon" aria-hidden="true">
                                <img src={icon} alt="" />
                            </span>
                            <span>
                                <b>{title}</b>
                                <small>{description}</small>
                            </span>
                        </Link>
                    ))}
                </div>
                <section className="landing-section">
                    <div className="section-heading">
                        <div>
                            <h2>Noticias</h2>
                            <p>
                                Una muestra de los recorridos disponibles en
                                EduPlan.
                            </p>
                        </div>
                        <Link to="/programas">Ver programas →</Link>
                    </div>
                    <div className="opportunity-grid">
                        {featuredOpportunities.map((item) => (
                            <Link
                                className="opportunity-card surface"
                                to={item.href}
                                key={item.title}
                            >
                                <img src={item.image} alt={item.imageAlt} />
                                <div className="opportunity-card-body">
                                    <span className="pill">{item.type}</span>
                                    <strong>{item.title}</strong>
                                    <p>{item.subtitle}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
                <section className="landing-section">
                    <div className="section-heading">
                        <div>
                            <h2>Oportunidades para explorar</h2>
                            <p>
                                Una muestra de los recorridos disponibles en
                                EduPlan.
                            </p>
                        </div>
                        <Link to="/programas">Ver programas →</Link>
                    </div>
                    <div className="opportunity-grid">
                        {featuredOpportunities.map((item) => (
                            <Link
                                className="opportunity-card surface"
                                to={item.href}
                                key={item.title}
                            >
                                <img src={item.image} alt={item.imageAlt} />
                                <div className="opportunity-card-body">
                                    <span className="pill">{item.type}</span>
                                    <strong>{item.title}</strong>
                                    <p>{item.subtitle}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
                <section className="landing-section">
                    <div className="section-heading">
                        <div>
                            <h2>¿Cómo funciona?</h2>
                            <p>
                                Avanza a tu ritmo, con la información que
                                necesitas.
                            </p>
                        </div>
                    </div>
                    <div className="steps">
                        {steps.map(([title, description], i) => (
                            <div key={title}>
                                <span className="step-number">{i + 1}</span>
                                <h3>{title}</h3>
                                <p>{description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
