import institutionIcon from "../assets/Images/instituciones.svg";

function websiteUrl(value) {
    if (!value?.trim()) return null;
    const candidate = value.trim();
    if (candidate.includes("@") || /\s/.test(candidate)) return null;
    try {
        const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
        return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".")
            && !url.username && !url.password ? url.href : null;
    } catch {
        return null;
    }
}

function InstitutionCard({ institution }) {
    const location = [institution.municipality, institution.department].filter(Boolean).join(" · ");
    const modalities = institution.modalities?.length
        ? institution.modalities.join(" · ")
        : "Dato no disponible";
    const website = websiteUrl(institution.website);

    return (
        <article className="institution-card">
            <div className="institution-card-cover" aria-hidden="true">
                <img src={institutionIcon} alt="" />
            </div>
            <div className="institution-card-body">
                <div className="institution-card-heading">
                    <h3>{institution.name}</h3>
                    {institution.sector && <span className="institution-card-badge">{institution.sector}</span>}
                </div>
                <p className="institution-card-location">{location || "Ubicación no disponible"}</p>
                <p className="institution-card-summary">
                    {institution.academicCharacter || "Institución de educación superior"}
                    {institution.address && ` · ${institution.address}`}
                </p>
                <p className="institution-card-modality"><strong>Modalidad:</strong> {modalities}</p>
                {website && (
                    <a className="institution-card-link" href={website} target="_blank" rel="noreferrer">
                        Ver sitio web
                    </a>
                )}
            </div>
        </article>
    );
}

export default InstitutionCard;
