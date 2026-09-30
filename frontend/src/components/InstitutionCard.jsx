import { Link } from "react-router-dom";
import institutionIcon from "../assets/Images/instituciones.svg";

import { websiteUrl } from "../utils/website";
export default function InstitutionCard({ institution }) {
    const location = [institution.municipality, institution.department]
        .filter(Boolean)
        .join(" · ");
    const website = websiteUrl(institution.website);
    return (
        <article className="institution-card">
            <div className="institution-card-cover" aria-hidden="true">
                <img src={institutionIcon} alt="" />
            </div>
            <div className="institution-card-body">
                <div className="institution-card-heading">
                    <h3>{institution.name}</h3>
                    {institution.sector && (
                        <span className="institution-card-badge">
                            {institution.sector}
                        </span>
                    )}
                </div>
                <p className="institution-card-location">
                    {location || "Ubicación no disponible"}
                </p>
                <p className="institution-card-summary">
                    {institution.academicCharacter ||
                        "Institución de educación superior"}
                    {institution.address && ` · ${institution.address}`}
                </p>
                <p className="institution-card-modality">
                    <strong>Modalidad:</strong>{" "}
                    {institution.modalities?.length
                        ? institution.modalities.join(" · ")
                        : "Dato no disponible"}
                </p>
            </div>
            <div className="institution-card-actions">
                <Link
                    className="btn btn-primary"
                    to={`/instituciones/${encodeURIComponent(institution.code)}`}
                    state={{ institution }}
                >
                    Ver institución
                </Link>
                {website && (
                    <a
                        className="btn btn-secondary"
                        href={website}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Sitio web ↗
                    </a>
                )}
            </div>
        </article>
    );
}
