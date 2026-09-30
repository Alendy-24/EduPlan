import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import SectionTabs from "../components/SectionTabs";
import { websiteUrl as safeWebsite } from "../utils/website";
import BookmarkButton from "../components/BookmarkButton";
import DemoNotice from "../components/DemoNotice";
import {
    demoInstitution,
    libraryImage,
    studyImage,
} from "../data/mock/catalog";
import { getInstitutionByCode } from "../services/institutions";

const tabs = [
    "Información",
    "Programas",
    "Admisión",
    "Becas",
    "Vida estudiantil",
];
export default function InstitutionDetailPage() {
    const { institutionId } = useParams();
    const { state } = useLocation();
    const demo = institutionId === demoInstitution.id;
    const [institution, setInstitution] = useState(
        demo ? demoInstitution : state?.institution || null,
    );
    const [loading, setLoading] = useState(!demo && !state?.institution);
    const [error, setError] = useState("");
    const [shareMessage, setShareMessage] = useState("");
    const [tab, setTab] = useState("Información");
    useEffect(() => {
        setError(""); setTab("Información"); setShareMessage("");
        const initial = demo ? demoInstitution : state?.institution?.code === institutionId ? state.institution : null;
        setInstitution(initial); setLoading(!demo && !initial);
        if (demo) return;
        const controller = new AbortController();
        getInstitutionByCode(institutionId, controller.signal)
            .then((value) => {
                if (controller.signal.aborted) return;
                setInstitution((current) =>
                    current?.code === value.code
                        ? { ...current, ...value }
                        : value,
                );
                setError("");
            })
            .catch(() => {
                if (!controller.signal.aborted)
                    setError(
                        "No pudimos cargar los datos actualizados de esta institución.",
                    );
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [institutionId, demo, state]);
    if (loading && !institution)
        return (
            <main className="page container">
                <p role="status">Cargando institución...</p>
            </main>
        );
    if (!institution)
        return (
            <main className="page container">
                <Link className="back-link" to="/instituciones">
                    ← Volver a resultados
                </Link>
                <div className="empty-state surface">
                    <h1>Detalle no disponible</h1>
                    <p role="alert">
                        {error || "No encontramos esta institución."}
                    </p>
                    <Link className="btn btn-primary" to="/instituciones">
                        Ver instituciones
                    </Link>
                </div>
            </main>
        );
    const name = institution.name,
        city = demo ? institution.city : institution.municipality,
        sector = institution.sector,
        character = demo
            ? institution.character
            : institution.academicCharacter,
        website = safeWebsite(institution.website);
    async function share() {
        try { await navigator.clipboard.writeText(window.location.href); setShareMessage("Enlace copiado."); }
        catch { setShareMessage("No pudimos copiar el enlace. Puedes copiar la dirección del navegador."); }
    }
    return (
        <main>
            <div className={`detail-banner${demo ? "" : " is-empty"}`}>
                {demo ? (
                    <img
                        src={demoInstitution.image}
                        alt="Campus universitario de referencia"
                    />
                ) : (
                    <div className="detail-banner-placeholder">
                        Imagen institucional no disponible en el catálogo
                    </div>
                )}
            </div>
            <div className="container">
                <div className="detail-header">
                    <div>
                        <Link className="back-link" to="/instituciones">
                            ← Volver a resultados
                        </Link>
                        <h1>{name}</h1>
                        <div className="metadata">
                            <span>{sector || "Sector no disponible"}</span>
                            <span>{character || "Tipo no disponible"}</span>
                            <span>{city || "Ciudad no disponible"}</span>
                        </div>
                    </div>
                    <div className="detail-actions">
                        <BookmarkButton
                            id={`institution-${institutionId}`}
                            label={name}
                        />
                        <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={share}
                        >
                            Compartir
                        </button>
                        {website && (
                            <a
                                className="btn btn-primary"
                                href={website}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Sitio web ↗
                            </a>
                        )}
                    </div>
                </div>
                {shareMessage && <p role="status">{shareMessage}</p>}
                {error && (
                    <p
                        className="notice"
                        role="alert"
                        style={{ marginTop: 18 }}
                    >
                        {error} Mostramos los datos disponibles de los
                        resultados.
                    </p>
                )}
                {demo && (
                    <div style={{ marginTop: 18 }}>
                        <DemoNotice />
                    </div>
                )}
                <SectionTabs items={tabs} value={tab} onChange={setTab} label="Información de institución">
                {tab === "Información" ? (
                    <>
                        <div className="detail-grid">
                            <section className="detail-copy">
                                <h2>Sobre la institución</h2>
                                <p>
                                    {demo
                                        ? institution.summary
                                        : "Los datos de esta institución provienen del catálogo público consultado por EduPlan. Para programas, admisiones y vida estudiantil, visita su sitio oficial."}
                                </p>
                                {institution.address && (
                                    <p>
                                        <strong>Dirección:</strong>{" "}
                                        {institution.address}
                                    </p>
                                )}
                                {institution.phone && (
                                    <p>
                                        <strong>Teléfono:</strong>{" "}
                                        {institution.phone}
                                    </p>
                                )}
                                <p>
                                    Revisa su ubicación y carácter académico
                                    antes de comparar opciones.
                                </p>
                            </section>
                            <aside className="facts surface">
                                <h2>Datos disponibles</h2>
                                <div className="fact-row">
                                    <span>Ciudad</span>
                                    <strong>{city || "No disponible"}</strong>
                                </div>
                                <div className="fact-row">
                                    <span>Departamento</span>
                                    <strong>
                                        {institution.department ||
                                            "No disponible"}
                                    </strong>
                                </div>
                                <div className="fact-row">
                                    <span>Sector</span>
                                    <strong>{sector || "No disponible"}</strong>
                                </div>
                                <div className="fact-row">
                                    <span>Carácter</span>
                                    <strong>
                                        {character || "No disponible"}
                                    </strong>
                                </div>
                                <div className="fact-row">
                                    <span>Modalidades</span>
                                    <strong>
                                        {institution.modalities?.join(", ") ||
                                            "No disponible"}
                                    </strong>
                                </div>
                            </aside>
                        </div>
                        {demo && (
                            <section className="landing-section">
                                <h2>Espacios para estudiar</h2>
                                <p className="subtle">
                                    Imágenes de referencia para la vista de
                                    ejemplo.
                                </p>
                                <div className="gallery">
                                    <img
                                        src={demoInstitution.image}
                                        alt="Edificio universitario de referencia"
                                    />
                                    <img
                                        src={libraryImage}
                                        alt="Biblioteca de referencia"
                                    />
                                    <img
                                        src={studyImage}
                                        alt="Estudiantes de referencia"
                                    />
                                </div>
                            </section>
                        )}
                    </>
                ) : (
                    <section className="detail-grid">
                        <div className="detail-copy">
                            <h2>{tab}</h2>
                            <p>
                                {tab === "Programas"
                                    ? "Explora los registros de programas asociados a esta institución en el catálogo público."
                                    : `La información de ${tab.toLocaleLowerCase("es")} aún no está disponible en este catálogo. Consulta la fuente oficial de la institución.`}
                            </p>
                            {tab === "Programas" && (
                                <Link
                                    className="btn btn-primary"
                                    to={`/instituciones/${institutionId}/programas`}
                                >
                                    Explorar programas
                                </Link>
                            )}
                        </div>
                        <aside className="cta-panel">
                            <h3>Información oficial</h3>
                            <p>
                                Confirma los detalles directamente con la
                                institución antes de tomar una decisión.
                            </p>
                            {website && (
                                <a
                                    className="btn btn-secondary"
                                    href={website}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Visitar sitio web ↗
                                </a>
                            )}
                        </aside>
                    </section>
                )}
                </SectionTabs>
            </div>
        </main>
    );
}
