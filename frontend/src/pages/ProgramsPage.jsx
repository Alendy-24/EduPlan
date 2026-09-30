import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProgramCard from '../components/ProgramCard';
import PageHeader from '../components/PageHeader';
import AsyncState from '../components/AsyncState';
import { getPrograms, PROGRAM_PAGE_SIZE } from '../services/programs';
import { getInstitutionByCode } from '../services/institutions';
import { mergePrograms } from '../utils/programs';
import { demoInstitution, programs as demos } from '../data/mock/catalog';
export default function ProgramsPage({ institutionOnly = false }) {
  const { institutionId } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '', city = params.get('city') || '', modality = params.get('modality') || '';
  const area = params.get('area') || '', level = params.get('level') || '', order = params.get('order') || 'source';
  const demo = institutionOnly && institutionId === demoInstitution.id;
  const [catalog, setCatalog] = useState({ key: '', programs: [], page: 1, hasMore: true });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [institution, setInstitution] = useState(null);
  const criteria = JSON.stringify({ name: query, municipality: city, modality, institutionCode: institutionOnly ? institutionId : '' });
  const page = catalog.key === criteria ? catalog.page : 1;
  const records = demo ? demos.map(p => ({ ...p, provenance: 'demo' })) : catalog.key === criteria ? catalog.programs : [];
  const hasMore = !demo && (catalog.key === criteria ? catalog.hasMore : true);
  function update(key, value) { setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true }); }
  useEffect(() => {
    if (!institutionOnly || demo) { setInstitution(demo ? demoInstitution : null); return; }
    const controller = new AbortController(); setInstitution(null);
    getInstitutionByCode(institutionId, controller.signal).then(setInstitution).catch(() => {});
    return () => controller.abort();
  }, [institutionId, institutionOnly, demo]);
  useEffect(() => {
    if (demo) { setLoading(false); setError(''); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      getPrograms(JSON.parse(criteria), page, controller.signal).then(incoming => {
        if (controller.signal.aborted) return;
        setCatalog(current => ({ key: criteria, programs: mergePrograms(page === 1 || current.key !== criteria ? [] : current.programs, incoming), page, hasMore: incoming.length === PROGRAM_PAGE_SIZE }));
        setLoading(false);
      }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoading(false); } });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [criteria, page, retry, demo]);
  const filtered = useMemo(() => records.filter(p => (!area || p.area === area) && (!level || p.level === level) && (!demo || (!query || p.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))) && (!city || p.city === city) && (!modality || p.modality === modality))).sort((a,b) => order === 'asc' ? a.name.localeCompare(b.name,'es') : order === 'desc' ? b.name.localeCompare(a.name,'es') : 0), [records, area, level, order, demo, query, city, modality]);
  return <main className="page"><div className="container">
    {institutionOnly && <Link className="back-link" to={`/instituciones/${encodeURIComponent(institutionId)}`}>← Volver a la institución</Link>}
    <PageHeader title={institutionOnly ? `Programas de ${institution?.name || 'esta institución'}` : 'Programas académicos'}>Explora la información publicada y compara las opciones que te interesan.</PageHeader>
    <p className="notice">{demo ? 'Demostración con datos ficticios. No representa una oferta académica verificada.' : 'Catálogo público del Ministerio de Educación. El estado y la información publicados deben confirmarse con la institución.'}</p>
    <div className="filter-bar program-filters">
      <label className="field">Buscar programas<input type="search" value={query} onChange={e => update('q',e.target.value)} placeholder="Nombre, título o área de conocimiento" /></label>
      <label className="field">Ciudad o municipio<input type="search" value={city} onChange={e => update('city',e.target.value)} placeholder="Por ejemplo, Bogotá" /></label>
      <label className="field">Modalidad<select value={modality} onChange={e => update('modality',e.target.value)}><option value="">Todas</option>{['Presencial','Virtual','A distancia','Presencial-Virtual'].map(v => <option key={v}>{v}</option>)}</select></label>
    </div>
    <div className="filter-bar local-filters">
      <label className="field">Área de los resultados cargados<select value={area} onChange={e => update('area',e.target.value)}><option value="">Todas</option>{[...new Set([...records.map(p => p.area).filter(Boolean), ...(area ? [area] : [])])].sort().map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="field">Nivel de los resultados cargados<select value={level} onChange={e => update('level',e.target.value)}><option value="">Todos</option>{[...new Set([...records.map(p => p.level), ...(level ? [level] : [])])].sort().map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="field">Orden de resultados cargados<select value={order} onChange={e => update('order',e.target.value)}><option value="source">Orden del catálogo</option><option value="asc">Nombre A–Z</option><option value="desc">Nombre Z–A</option></select></label>
      <button className="btn btn-secondary" type="button" disabled={!params.size} onClick={() => setParams({})}>Limpiar filtros</button>
    </div>
    <p className="subtle">Área, nivel y orden se aplican a las opciones cargadas; no al catálogo completo.</p>
    <div className="results-line"><strong>{filtered.length} coincidencias en {records.length} registros cargados</strong><Link to="/comparar">Abrir comparador →</Link></div>
    <div className="listing">{filtered.map(p => <ProgramCard key={p.id} program={p} />)}</div>
    <AsyncState loading={loading} error={error} onRetry={() => setRetry(v => v+1)} empty={!filtered.length}><p>{hasMore ? 'No hay coincidencias entre las opciones cargadas. Puedes cargar más o cambiar los filtros.' : 'Prueba otra búsqueda o cambia los filtros.'}</p></AsyncState>
    {hasMore && !loading && !error && <button className="btn btn-secondary load-more" type="button" onClick={() => { setLoading(true); setCatalog(current => ({ ...current, page: current.page + 1 })); }}>Cargar más programas</button>}
  </div></main>;
}
