import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProgramCard from '../components/ProgramCard';
import PageHeader from '../components/PageHeader';
import AsyncState from '../components/AsyncState';
import InstitutionSearch from '../components/InstitutionSearch';
import { getPrograms, getProgramFilterOptions, PROGRAM_PAGE_SIZE } from '../services/programs';
import { getInstitutionByCode } from '../services/institutions';
import { mergePrograms } from '../utils/programs';
import { useOfficialPrograms } from '../hooks/useOfficialPrograms';
import { demoInstitution, programs as demos } from '../data/mock/catalog';
import '../styles/program-search.css';
const emptyOptions = { academicLevels: [], knowledgeAreas: [], modalities: [], institutions: [] };
const withSelection = (options, selected) => [...new Set([...options, ...(selected ? [selected] : [])])];
export default function ProgramsPage({ institutionOnly = false }) {
  const { institutionId } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '', city = params.get('city') || '', modality = params.get('modality') || '';
  const area = params.get('area') || '', level = params.get('level') || '', order = params.get('order') || 'source';
  const university = institutionOnly ? institutionId || '' : params.get('institution') || '';
  const demo = institutionOnly && institutionId === demoInstitution.id;
  const [catalog, setCatalog] = useState({ key: '', programs: [], page: 1, hasMore: true });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [institution, setInstitution] = useState(null);
  const [optionsState, setOptionsState] = useState({ data: emptyOptions, loading: true, error: '' });
  const [optionsRetry, setOptionsRetry] = useState(0);
  const criteria = JSON.stringify({ name: query, municipality: city, modality, institutionCode: university, academicLevel: level, knowledgeArea: area, order });
  const page = catalog.key === criteria ? catalog.page : 1;
  const records = useOfficialPrograms(demo ? demos.map(p => ({ ...p, provenance: 'demo' })) : catalog.key === criteria ? catalog.programs : []);
  const hasMore = !demo && (catalog.key === criteria ? catalog.hasMore : true);
  function update(key, value) { setParams(current => { const next = new URLSearchParams(current); if (value && !(key === 'order' && value === 'source')) next.set(key, value); else next.delete(key); return next; }, { replace: true }); }
  useEffect(() => {
    if (!institutionOnly || demo) { setInstitution(demo ? demoInstitution : null); return; }
    const controller = new AbortController(); setInstitution(null);
    getInstitutionByCode(institutionId, controller.signal).then(value => { if (!controller.signal.aborted) setInstitution(value); }).catch(() => {});
    return () => controller.abort();
  }, [institutionId, institutionOnly, demo]);
  useEffect(() => {
    if (demo) { setOptionsState({ data: { academicLevels: [...new Set(demos.map(p => p.level))], knowledgeAreas: [...new Set(demos.map(p => p.area))], modalities: [...new Set(demos.map(p => p.modality))], institutions: [] }, loading: false, error: '' }); return; }
    const controller = new AbortController();
    setOptionsState(current => ({ ...current, loading: true, error: '' }));
    getProgramFilterOptions(controller.signal).then(data => { if (!controller.signal.aborted) setOptionsState({ data, loading: false, error: '' }); }).catch(reason => { if (!controller.signal.aborted) setOptionsState(current => ({ ...current, loading: false, error: reason.message })); });
    return () => controller.abort();
  }, [demo, optionsRetry]);
  useEffect(() => {
    if (demo) { setLoading(false); setError(''); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      getPrograms(JSON.parse(criteria), page, controller.signal).then(incoming => {
        if (controller.signal.aborted) return;
        setCatalog(current => ({ key: criteria, programs: mergePrograms(page === 1 || current.key !== criteria ? [] : current.programs, incoming.programs), unusableCount: (page === 1 || current.key !== criteria ? 0 : current.unusableCount || 0) + incoming.unusableCount, page, hasMore: incoming.receivedCount === PROGRAM_PAGE_SIZE }));
        setLoading(false);
      }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoading(false); } });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [criteria, page, retry, demo]);
  const filtered = useMemo(() => demo ? records.filter(p => (!area || p.area === area) && (!level || p.level === level) && (!query || p.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))) && (!city || p.city.toLocaleLowerCase('es').includes(city.toLocaleLowerCase('es'))) && (!modality || p.modality === modality)).sort((a,b) => order === 'asc' ? a.name.localeCompare(b.name,'es') : order === 'desc' ? b.name.localeCompare(a.name,'es') : 0) : records, [records, area, level, order, demo, query, city, modality]);
  const options = optionsState.data;
  const selectedUniversity = institutionOnly ? institution?.name || `Institución ${university}` : options.institutions.find(item => item.code === university)?.name || `Institución ${university}`;
  const activeFilters = [['q',query,'Búsqueda'],['city',city,'Ciudad'],['level',level,'Nivel'],...(!institutionOnly ? [['institution',university,'Universidad']] : []),['area',area,'Área'],['modality',modality,'Modalidad'],['order',order !== 'source' ? order : '','Orden']].filter(([,value]) => value).map(([key,value,label]) => ({ key, label, value: key === 'institution' ? selectedUniversity : key === 'order' ? value === 'asc' ? 'Nombre A–Z' : 'Nombre Z–A' : value }));
  return <main className="page programs-search-page"><div className="container">
    {institutionOnly && <Link className="back-link" to={`/instituciones/${encodeURIComponent(institutionId)}`}>← Volver a la institución</Link>}
    <PageHeader title={institutionOnly ? `Programas de ${institution?.name || 'esta institución'}` : 'Programas académicos'}>Explora la información publicada y compara las opciones que te interesan.</PageHeader>
    <p className="notice">{demo ? 'Demostración con datos ficticios. No representa una oferta académica verificada.' : 'Catálogo público del Ministerio de Educación. Confirma con la institución el estado y la información publicados.'}</p>
    <section className="program-search-panel" aria-label="Filtros de programas">
      <div className="program-search-primary">
        <label className="field">Buscar programas<input type="search" value={query} onChange={e => update('q',e.target.value)} placeholder="Nombre, título o área de conocimiento" /></label>
        <label className="field">Ciudad o municipio<input type="search" value={city} onChange={e => update('city',e.target.value)} placeholder="Por ejemplo, Bogotá" /></label>
        <div className="field"><label htmlFor="program-level">Nivel académico</label><select id="program-level" value={level} onChange={e => update('level',e.target.value)} disabled={optionsState.loading && !level}><option value="">Todos</option>{withSelection(options.academicLevels,level).map(v => <option key={v}>{v}</option>)}</select></div>
      </div>
      <div className="program-search-university">
        {institutionOnly ? <p className="program-fixed-institution"><strong>Universidad o institución:</strong> {selectedUniversity}</p> : <InstitutionSearch institutions={options.institutions} value={university} selectedName={selectedUniversity} disabled={optionsState.loading && !university} onChange={value => update('institution',value)} />}
        <button className="btn btn-secondary" type="button" disabled={!activeFilters.length} onClick={() => setParams({})}>Limpiar filtros</button>
      </div>
      <details className="program-more-filters" open={area || modality || order !== 'source' ? true : undefined}>
        <summary>Más filtros</summary>
        <div className="program-search-extra">
          <div className="field"><label htmlFor="program-area">Área de conocimiento</label><select id="program-area" value={area} onChange={e => update('area',e.target.value)} disabled={optionsState.loading && !area}><option value="">Todas</option>{withSelection(options.knowledgeAreas,area).map(v => <option key={v}>{v}</option>)}</select></div>
          <div className="field"><label htmlFor="program-modality">Modalidad</label><select id="program-modality" value={modality} onChange={e => update('modality',e.target.value)} disabled={optionsState.loading && !modality}><option value="">Todas</option>{withSelection(options.modalities,modality).map(v => <option key={v}>{v}</option>)}</select></div>
          <div className="field"><label htmlFor="program-order">Ordenar por</label><select id="program-order" value={order} onChange={e => update('order',e.target.value)}><option value="source">{query.trim() && !demo ? 'Relevancia de búsqueda' : 'Orden del catálogo'}</option><option value="asc">Nombre A–Z</option><option value="desc">Nombre Z–A</option></select></div>
        </div>
      </details>
      {optionsState.loading && <p className="subtle" role="status">Cargando filtros del catálogo…</p>}
      {optionsState.error && <div className="program-filter-error" role="alert"><p>{optionsState.error}</p><button className="btn btn-secondary" type="button" onClick={() => setOptionsRetry(v => v + 1)}>Reintentar filtros</button></div>}
    </section>
    {activeFilters.length > 0 && <ul className="program-active-filters" aria-label="Filtros activos">{activeFilters.map(filter => <li key={filter.key}><button type="button" onClick={() => update(filter.key,'')} aria-label={`Quitar filtro ${filter.label}: ${filter.value}`}><span>{filter.label}: {filter.value}</span><span aria-hidden="true">×</span></button></li>)}</ul>}
    {!demo && <p className="subtle">Los filtros y el orden se aplican a todo el catálogo. El conteo corresponde a los registros cargados.</p>}
    {query.trim() && !demo && order === 'source' && <p className="subtle">La búsqueda prioriza nombres y títulos coincidentes, después similares y finalmente coincidencias solo por área.</p>}
    <div className="results-line"><strong>{!records.length && (error || loading) ? loading ? 'Consultando el catálogo…' : 'No se pudieron cargar resultados.' : `${filtered.length} ${filtered.length === 1 ? 'programa cargado' : 'programas cargados'}`}</strong><Link to="/comparar">Abrir comparador →</Link></div>
    {catalog.key === criteria && catalog.unusableCount > 0 && <p className="subtle" role="status">{catalog.unusableCount} {catalog.unusableCount === 1 ? 'registro recibido no puede mostrarse porque le falta' : 'registros recibidos no pueden mostrarse porque les falta'} identidad o información utilizable. Las demás opciones siguen disponibles.</p>}
    <div className="listing">{filtered.map(p => <ProgramCard key={p.id} program={p} searchQuery={query} />)}</div>
    <AsyncState loading={loading} error={error} onRetry={() => setRetry(v => v+1)} empty={!filtered.length}><p>Prueba otra búsqueda o cambia los filtros.</p></AsyncState>
    {hasMore && !loading && !error && <button className="btn btn-secondary load-more" type="button" onClick={() => { setLoading(true); setCatalog(current => ({ ...current, page: current.page + 1 })); }}>Cargar más programas</button>}
  </div></main>;
}
