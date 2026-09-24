import { useEffect, useRef, useState } from "react";
import InstitutionCard from "../components/InstitutionCard";
import { getInstitutions } from "../services/institutions";
import "./InstitutionsPage.css";

const MODALITIES = ["Presencial", "A distancia", "Virtual", "Presencial-Virtual"];
const SECTORS = ["Oficial", "Privado"];
const ACADEMIC_CHARACTERS = [
    "Universidad",
    "Institución Universitaria/Escuela Tecnológica",
    "Institución Tecnológica",
    "Institución Técnica Profesional",
];
const EMPTY_TEXT = { name: "", municipality: "", program: "" };

function InstitutionsPage() {
    const [name, setName] = useState(() => new URLSearchParams(window.location.search).get('q') || "");
    const [municipality, setMunicipality] = useState(() => new URLSearchParams(window.location.search).get('city') || "");
    const [program, setProgram] = useState("");
    const [textFilters, setTextFilters] = useState(() => ({ ...EMPTY_TEXT, name: new URLSearchParams(window.location.search).get('q') || "", municipality: new URLSearchParams(window.location.search).get('city') || "" }));
    const [modality, setModality] = useState("");
    const [sector, setSector] = useState("");
    const [academicCharacter, setAcademicCharacter] = useState(() => new URLSearchParams(window.location.search).get('academicCharacter') || "");
    const [institutions, setInstitutions] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setTextFilters({
                name: name.trim(),
                municipality: municipality.trim(),
                program: program.trim(),
            });
        }, 350);
        return () => clearTimeout(timeout);
    }, [name, municipality, program]);

    const criteriaKey = JSON.stringify({ ...textFilters, modality, sector, academicCharacter });
    const activeCriteria = useRef(criteriaKey);

    useEffect(() => {
        if (activeCriteria.current !== criteriaKey) {
            activeCriteria.current = criteriaKey;
            setInstitutions([]);
            setHasMore(true);
            setPage(1);
            if (page !== 1) return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError("");
        getInstitutions(JSON.parse(criteriaKey), page, controller.signal)
            .then(({ institutions: fetched, hasMore: more }) => {
                setInstitutions((current) => {
                    if (page === 1) return fetched;
                    const seen = new Set(current.map((institution) => institution.code));
                    return [...current, ...fetched.filter((institution) => {
                        if (seen.has(institution.code)) return false;
                        seen.add(institution.code);
                        return true;
                    })];
                });
                setHasMore(more);
                setLoading(false);
            })
            .catch((reason) => {
                if (reason.name !== "AbortError") {
                    setError("No pudimos cargar las instituciones. Inténtalo de nuevo.");
                    setLoading(false);
                }
            });
        return () => controller.abort();
    }, [criteriaKey, page, retry]);

    const hasFilters = Boolean(name || municipality || program || modality || sector || academicCharacter);

    function clearFilters() {
        setName("");
        setMunicipality("");
        setProgram("");
        setTextFilters(EMPTY_TEXT);
        setModality("");
        setSector("");
        setAcademicCharacter("");
        setPage(1);
    }

    function applyTextFilters(event) {
        event.preventDefault();
        setTextFilters({ name: name.trim(), municipality: municipality.trim(), program: program.trim() });
    }

    return (
        <main className="institutions-page">
            <div className="institutions-panel">
                <div className="institutions-intro">
                    <h1>Búsqueda de instituciones</h1>
                    <p>Explora universidades e instituciones de educación superior en Colombia. Filtra por ubicación, programas y tipo de institución.</p>
                </div>

                <form className="institutions-search" onSubmit={applyTextFilters} role="search">
                    <label className="visually-hidden" htmlFor="institution-name">Buscar instituciones por nombre</label>
                    <span className="institutions-search-icon" aria-hidden="true">⌕</span>
                    <input
                        id="institution-name"
                        type="search"
                        placeholder="Busca universidades"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    <button className="btn-primary" type="submit">Buscar</button>
                </form>

                <div className="institutions-filters" aria-label="Filtros de instituciones">
                    <label className="institution-filter-field">
                        <span>Ubicación</span>
                        <input
                            type="search"
                            placeholder="Ciudad o municipio"
                            value={municipality}
                            onChange={(event) => setMunicipality(event.target.value)}
                        />
                    </label>
                    <label className="institution-filter-field">
                        <span>Programas</span>
                        <input
                            type="search"
                            placeholder="Nombre del programa"
                            value={program}
                            onChange={(event) => setProgram(event.target.value)}
                        />
                    </label>
                    <label className="institution-filter-field">
                        <span>Modalidad</span>
                        <select value={modality} onChange={(event) => setModality(event.target.value)}>
                            <option value="">Todas</option>
                            {MODALITIES.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </label>
                    <label className="institution-filter-field">
                        <span>Sector</span>
                        <select value={sector} onChange={(event) => setSector(event.target.value)}>
                            <option value="">Todos</option>
                            {SECTORS.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </label>
                    <label className="institution-filter-field institution-filter-character">
                        <span>Tipo</span>
                        <select value={academicCharacter} onChange={(event) => setAcademicCharacter(event.target.value)}>
                            <option value="">Todos los tipos</option>
                            {ACADEMIC_CHARACTERS.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </label>
                    <button className="btn-secondary institutions-clear" type="button" onClick={clearFilters} disabled={!hasFilters}>
                        Limpiar filtros
                    </button>
                </div>

                <p className="institutions-availability">
                    El catálogo actual no incluye presupuesto, campus ni enfoque. Datos públicos del
                    {" "}<a href="https://www.datos.gov.co/d/n5yy-8nav" target="_blank" rel="noreferrer">Ministerio de Educación Nacional</a>.
                </p>

                <section id="institution-results" className="institutions-results" aria-live="polite">
                    {!error && institutions.length > 0 && (
                        <p className="institutions-count">Mostrando {institutions.length} {institutions.length === 1 ? 'institución' : 'instituciones'}</p>
                    )}
                    {institutions.length > 0 && (
                        <div className="institutions-grid">
                            {institutions.map((institution) => (
                                <InstitutionCard key={institution.code} institution={institution} />
                            ))}
                        </div>
                    )}
                    {loading && <p className="institutions-feedback" role="status">Cargando instituciones...</p>}
                    {error && (
                        <div className="institutions-feedback" role="alert">
                            <p>{error}</p>
                            <button className="btn-secondary" type="button" onClick={() => setRetry((value) => value + 1)}>
                                Reintentar
                            </button>
                        </div>
                    )}
                    {!loading && !error && institutions.length === 0 && (
                        <div className="institutions-feedback">
                            <h2>No encontramos instituciones con esos criterios.</h2>
                            <p>Prueba con otro nombre o cambia los filtros.</p>
                            {hasFilters && <button className="btn-secondary" type="button" onClick={clearFilters}>Limpiar filtros</button>}
                        </div>
                    )}
                    {!loading && !error && hasMore && institutions.length > 0 && (
                        <button className="btn-secondary institutions-more" type="button" onClick={() => setPage((value) => value + 1)}>
                            Mostrar más instituciones
                        </button>
                    )}
                </section>
            </div>
        </main>
    );
}

export default InstitutionsPage;
