import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProgramCard from '../components/ProgramCard';
import PageHeader from '../components/PageHeader';
import AsyncState from '../components/AsyncState';
import ProgramComparisonBar from '../components/ProgramComparisonBar';
import { facetCount, filterParams, relaxationLabels } from '../utils/program-search';
import CareerSearch from '../components/CareerSearch';
import { departments, findDepartment, findCity } from '../utils/profile-location';
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
  const department = params.get('department') || '';
  const area = params.get('area') || '', level = params.get('level') || '', order = params.get('order') || 'source';
  const university = institutionOnly ? institutionId || '' : params.get('institution') || '';
  const demo = institutionOnly && institutionId === demoInstitution.id;
  const [catalog, setCatalog] = useState({ key: '', programs: [], page: 1, hasMore: true });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [institution, setInstitution] = useState(null);
  const [optionsState, setOptionsState] = useState({ data: emptyOptions, loading: true, error: '' });
  const [optionsRetry, setOptionsRetry] = useState(0);
  const criteria = JSON.stringify({ name: query, municipality: city, department, modality, institutionCode: university, academicLevel: level, knowledgeArea: area, order });
  const page = catalog.key === criteria ? catalog.page : 1;
  const records = useOfficialPrograms(demo ? demos.map(p => ({ ...p, provenance: 'demo' })) : catalog.key === criteria ? catalog.programs : []);
  const hasMore = !demo && (catalog.key === criteria ? catalog.hasMore : true);
  function update(key, value) { setParams(current => { const next = new URLSearchParams(current); if (value && !(key === 'order' && value === 'source')) next.set(key, value); else next.delete(key); if (key === 'department') next.delete('city'); return next; }, { replace: true }); }
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
        setCatalog(current => ({ key: criteria, programs: mergePrograms(page === 1 || current.key !== criteria ? [] : current.programs, incoming.programs), unusableCount: (page === 1 || current.key !== criteria ? 0 : current.unusableCount || 0) + incoming.unusableCount, page, hasMore: incoming.hasMore ?? incoming.receivedCount === PROGRAM_PAGE_SIZE, total: incoming.total, facets: incoming.facets, alternatives: incoming.alternatives }));
        setLoading(false);
      }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoading(false); } });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [criteria, page, retry, demo]);
  const filtered = useMemo(() => demo ? records.filter(p => (!area || p.area === area) && (!level || p.level === level) && (!query || p.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))) && (!department || findCity(department, p.city)) && (!city || p.city.toLocaleLowerCase('es').includes(city.toLocaleLowerCase('es'))) && (!modality || p.modality === modality)).sort((a,b) => order === 'asc' ? a.name.localeCompare(b.name,'es') : order === 'desc' ? b.name.localeCompare(a.name,'es') : order === 'institution-asc' ? a.institution.localeCompare(b.institution,'es') || a.name.localeCompare(b.name,'es') : 0) : records, [records, area, level, order, demo, query, city, department, modality]);
  const options = optionsState.data;
  const cities = findDepartment(department)?.cities || [];
  const demoNames = useMemo(() => demo ? [...new Set(demos.map(program => program.name))] : undefined, [demo]);
  const metadata = !demo && catalog.key === criteria ? catalog : {};
  const facets = metadata.facets;
  function option(name, key, selected) {
    const count = facetCount(facets, key, name);
    return <option key={name} value={name} disabled={count === 0 && name !== selected}>{name}{count === undefined ? '' : ` (${count})`}</option>;
  }
  function relaxFilters(remove) {
    setParams(current => {
      const next = new URLSearchParams(current);
      remove.forEach(key => next.delete(filterParams[key]));
      return next;
    }, { replace: true });
  }
  const alternatives = (metadata.alternatives || []).filter(item => !institutionOnly || !item.remove.includes('institutionCode'));
  const orderLabels = { source: 'Más relacionados con tu búsqueda', asc: 'Nombre A–Z', desc: 'Nombre Z–A', 'institution-asc': 'Universidad A–Z' };
  const selectedUniversity = institutionOnly ? institution?.name || `Institución ${university}` : options.institutions.find(item => item.code === university)?.name || `Institución ${university}`;
  const activeFilters = [['q',query,'Carrera'],['department',department,'Departamento'],['city',city,'Ciudad'],['level',level,'Nivel'],...(!institutionOnly ? [['institution',university,'Universidad']] : []),['area',area,'Área'],['modality',modality,'Modalidad'],['order',order !== 'source' ? order : '','Orden']].filter(([,value]) => value).map(([key,value,label]) => ({ key, label, value: key === 'institution' ? selectedUniversity : key === 'order' ? orderLabels[value] : value }));
  return <main className="page programs-search-page"><div className="container">
    {institutionOnly && <Link className="back-link" to={`/instituciones/${encodeURIComponent(institutionId)}`}>← Volver a la institución</Link>}
    <PageHeader title={institutionOnly ? `Programas de ${institution?.name || 'esta institución'}` : 'Programas académicos'}>Explora la información publicada y compara las opciones que te interesan.</PageHeader>
    <p className="notice">{demo ? 'Demostración con datos ficticios. No representa una oferta académica verificada.' : 'Catálogo público del Ministerio de Educación. Confirma con la institución el estado y la información publicados.'}</p>
    <section className="program-search-panel" aria-label="Filtros de programas">
      {institutionOnly && <p className="program-fixed-institution"><strong>Universidad o institución:</strong> {selectedUniversity}</p>}
      <div className="program-search-primary">
        <CareerSearch value={query} onChange={value => update('q', value)} academicLevel={level} institutionCode={university} demoNames={demoNames} />
        <div className="field"><label htmlFor="program-department">Departamento</label><select id="program-department" value={department} onChange={e => update('department',e.target.value)}><option value="">Toda Colombia</option>{withSelection(departments.map(item => item.name), department).map(name => option(name, 'department', department))}</select></div>
        <div className="field"><label htmlFor="program-city">Ciudad o municipio</label><select id="program-city" value={city} disabled={!department && !city} onChange={e => update('city',e.target.value)}><option value="">{department ? 'Todas las ciudades' : 'Elige un departamento'}</option>{withSelection(cities.map(item => item.name), city).map(name => option(name, 'municipality', city))}</select></div>
        <div className="field"><label htmlFor="program-level">Nivel académico</label><select id="program-level" value={level} onChange={e => update('level',e.target.value)} disabled={optionsState.loading && !level}><option value="">Todos los niveles</option>{withSelection(options.academicLevels,level).map(v => option(v, 'academicLevel', level))}</select></div>
        <div className="field"><label htmlFor="program-modality">Modalidad</label><select id="program-modality" value={modality} onChange={e => update('modality',e.target.value)} disabled={optionsState.loading && !modality}><option value="">Todas las modalidades</option>{withSelection(options.modalities,modality).map(v => option(v, 'modality', modality))}</select></div>
      </div>
      <div className="program-search-hint"><p className="subtle">Escribe una carrera o elige una sugerencia. Incluimos programas con nombres relacionados.</p><button className="btn btn-secondary" type="button" disabled={!activeFilters.length} onClick={() => setParams({})}>Limpiar filtros</button></div>
      <details className="program-more-filters" open={area || !institutionOnly && university ? true : undefined}>
        <summary>Más filtros</summary>
        <div className="program-search-extra">
          {!institutionOnly && <InstitutionSearch institutions={options.institutions} counts={facets ? Object.fromEntries(facets.institutionCode.map(item => [item.value,item.count])) : undefined} value={university} selectedName={selectedUniversity} disabled={optionsState.loading && !university} onChange={value => update('institution',value)} />}
          <div className="field"><label htmlFor="program-area">Área de conocimiento</label><select id="program-area" value={area} onChange={e => update('area',e.target.value)} disabled={optionsState.loading && !area}><option value="">Todas las áreas</option>{withSelection(options.knowledgeAreas,area).map(v => option(v, 'knowledgeArea', area))}</select></div>
        </div>
      </details>
      {optionsState.loading && <p className="subtle" role="status">Cargando filtros del catálogo…</p>}
      {optionsState.error && <div className="program-filter-error" role="alert"><p>{optionsState.error}</p><button className="btn btn-secondary" type="button" onClick={() => setOptionsRetry(v => v + 1)}>Reintentar filtros</button></div>}
    </section>
    {activeFilters.length > 0 && <ul className="program-active-filters" aria-label="Filtros activos">{activeFilters.map(filter => <li key={filter.key}><button type="button" onClick={() => update(filter.key,'')} aria-label={`Quitar filtro ${filter.label}: ${filter.value}`}><span>{filter.label}: {filter.value}</span><span aria-hidden="true">×</span></button></li>)}</ul>}
    {!demo && <p className="subtle">Las cantidades corresponden a ofertas de todo el catálogo. Sedes y modalidades distintas se muestran por separado.</p>}
    {query.trim() && !demo && order === 'source' && <p className="subtle">La búsqueda prioriza nombres y títulos coincidentes, después similares y coincidencias por área y variantes de escritura.</p>}
    <div className="results-line program-results-toolbar"><strong>{!records.length && (error || loading) ? loading ? 'Consultando el catálogo…' : 'No se pudieron cargar resultados.' : metadata.total !== undefined ? `${metadata.total} ${metadata.total === 1 ? 'oferta encontrada' : 'ofertas encontradas'}` : `${filtered.length} ${filtered.length === 1 ? 'programa cargado' : 'programas cargados'}`}</strong><div className="field program-order-field"><label htmlFor="program-order">Ordenar por</label><select id="program-order" value={order} onChange={e => update('order',e.target.value)}>{Object.entries(orderLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><Link to="/comparar">Abrir comparador →</Link></div>
    {catalog.key === criteria && catalog.unusableCount > 0 && <p className="subtle" role="status">{catalog.unusableCount} {catalog.unusableCount === 1 ? 'registro recibido no puede mostrarse porque le falta' : 'registros recibidos no pueden mostrarse porque les falta'} identidad o información utilizable. Las demás opciones siguen disponibles.</p>}
    {metadata.total > 0 && <p className="subtle program-visible-count" role="status">Mostrando {filtered.length} de {metadata.total} ofertas.</p>}
    <div className="listing">{filtered.map(p => <ProgramCard key={p.id} program={p} searchQuery={query} />)}</div>
    <AsyncState loading={loading} error={error} onRetry={() => setRetry(v => v+1)} empty={!filtered.length}><p>{query.trim() ? `No encontramos ofertas para «${query.trim()}» con estos filtros.` : 'No encontramos ofertas con estos filtros.'}</p>
      {alternatives.length > 0 && <div className="program-empty-actions">{alternatives.map(item => <button key={item.remove[0]} className="btn btn-secondary" type="button" onClick={() => relaxFilters(item.remove)}>{item.remove[0] === 'municipality' && !department ? 'Ver todas las ciudades' : relaxationLabels[item.remove[0]]} ({item.count})</button>)}</div>}
      {activeFilters.some(filter => !['q','order'].includes(filter.key)) && <button type="button" className="plain-button text-link" onClick={() => setParams(query ? { q: query } : {})}>Quitar los demás filtros y conservar la carrera</button>}
      <p className="subtle">También puedes probar otro nombre de carrera. La búsqueda reconoce errores de escritura frecuentes.</p>
    </AsyncState>
    {hasMore && !loading && !error && <button className="btn btn-secondary load-more" type="button" onClick={() => { setLoading(true); setCatalog(current => ({ ...current, page: current.page + 1 })); }}>Cargar más programas</button>}
    <ProgramComparisonBar />
  </div></main>;
}
