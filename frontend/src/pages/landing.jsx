import { Link } from "react-router-dom";
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
        "Infórmate con contenido relevante para tu camino académico.",
    ],
    [
        "Mis intereses",
        "/perfil",
        PerfilamientoIcon,
        "Organiza las áreas y actividades que te interesan.",
    ],
    [
        "Orientación",
        "/guias",
        OrientacionIcon,
        "Lee preguntas y pasos para explorar tus opciones.",
    ],
];
const steps = [
    ["Busca", "Explora programas, instituciones y becas."],
    ["Compara", "Revisa opciones lado a lado."],
    ["Infórmate", "Consulta requisitos y recursos."],
    ["Decide", "Elige tus siguientes pasos con claridad."],
];

export default function Landing() {
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
                        <Link className="btn btn-primary" to="/programas">Explorar programas</Link>
                    </div>
                </div>
            </section>
          
           <div className="container">


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
                            <h2>Oportunidades para explorar</h2>
                            <p>
                                Accesos para seguir explorando en
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
