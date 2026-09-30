import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useExploration } from '../contexts/ExplorationContext';
import { useProfileInterests } from '../hooks/useProfileInterests';
import { getProgramsByCode } from '../services/programs';
import { getInstitutionByCode } from '../services/institutions';
import { programItem, withOfficialProgram } from '../utils/programs';
import { getProgramLink } from '../services/program-links';
import { snapshotChanges } from '../utils/saved';
import { scholarships } from '../data/scholarships';
import { scholarshipItem } from '../services/scholarships';
import PageHeader from '../components/PageHeader';
const actions = [['Explorar programas','/programas'],['Buscar instituciones','/instituciones'],['Ver becas','/becas'],['Recibir orientación','/guias']];
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('es-CO') : null;
export default function DashboardPage() {
  const { user, persistent: sessionPersistent } = useAuth();
  const { saved, removeSaved, updateSaved, persistent, syncState, syncError, retrySync } = useExploration();
  const { progress } = useProfileInterests();
  const [checking,setChecking] = useState(false), [updates,setUpdates] = useState({}), [checkedAt,setCheckedAt] = useState(null);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function checkUpdates() {
    if (checking) return;
    const request = new AbortController(); controller.current = request; setChecking(true);
    const result = {}, byCode = new Map();
    try {
      for (const item of saved) {
        if (request.signal.aborted) return;
        try {
          let current;
          if (item.type === 'program' && item.snapshot?.provenance === 'real' && item.snapshot.code && item.snapshot.sourceId) {
            if (!byCode.has(item.snapshot.code)) byCode.set(item.snapshot.code, getProgramsByCode(item.snapshot.code,request.signal));
            const response = await byCode.get(item.snapshot.code);
            const program = response.programs.find(value => value.sourceId === item.snapshot.sourceId);
            if (!program) { result[item.id] = { state: 'missing' }; continue; }
            let link;
            try { link = await getProgramLink(program.sourceId,request.signal); } catch { /* Preserve the catalog summary if official metadata is unavailable. */ }
            current = programItem(withOfficialProgram(program,link));
          } else if (item.type === 'institution' && /^\d+$/.test(item.snapshot?.code || '')) {
            const value = await getInstitutionByCode(item.snapshot.code,request.signal);
            current = { ...item, name: value.name, snapshot: { code: value.code, name: value.name, city: value.municipality || '', sector: value.sector || '', academicCharacter: value.academicCharacter || '', website: value.website || '' } };
          } else if (item.type === 'opportunity') {
            const opportunity = scholarships.find(value => `opportunity-${value.id}` === item.id);
            if (!opportunity) { result[item.id] = { state: 'missing' }; continue; }
            current = scholarshipItem(opportunity);
          } else { result[item.id] = { state: 'unverified' }; continue; }
          const changes = snapshotChanges({ name: item.name, ...item.snapshot },{ name: current.name, ...current.snapshot });
          result[item.id] = { state: changes.length ? 'changed' : 'same', changes, current };
        } catch { result[item.id] = { state: 'error' }; }
      }
      if (!request.signal.aborted) { setUpdates(result); setCheckedAt(new Date().toISOString()); }
    } finally { if (!request.signal.aborted) setChecking(false); }
  }
  function acceptUpdate(item) {
    const current = updates[item.id]?.current; if (!current) return;
    updateSaved(current); setUpdates(previous => ({ ...previous, [item.id]: { state: 'same' } }));
  }
  return <main className="page"><div className="container"><PageHeader title={`Hola, ${user.name}`}>¿Qué quieres explorar hoy?</PageHeader>{!sessionPersistent && <p role="status">La sesión no pudo guardarse en esta pestaña; necesitarás iniciar sesión al recargar.</p>}
    <section className="dashboard-section"><div className="dashboard-actions">{actions.map(([title,href])=><Link className="dashboard-action surface" key={href} to={href}><strong>{title} →</strong></Link>)}</div></section>
    <section className="dashboard-section"><h2>Tus guardados</h2><p className="subtle">Asociados a tu cuenta. Inicia sesión para recuperarlos desde otro dispositivo. La comparación se conserva en este dispositivo.</p>
      <div className="detail-actions"><button className="btn btn-secondary" type="button" disabled={syncState === 'loading' || syncState === 'saving'} onClick={retrySync}>Actualizar guardados de mi cuenta</button>{saved.length > 0 && <button className="btn btn-secondary" type="button" disabled={checking || syncState === 'loading'} onClick={checkUpdates}>{checking ? 'Comprobando…' : 'Comprobar cambios en las fuentes'}</button>}</div>
      {syncState === 'loading' && <p role="status">Cargando guardados de tu cuenta…</p>}{syncState === 'saving' && <p role="status">Sincronizando cambios…</p>}{syncState === 'synced' && <p className="subtle" role="status">Guardados sincronizados con tu cuenta.</p>}{syncError && <p role="alert">{syncError}</p>}{!persistent && <p role="status">El almacenamiento de este dispositivo no está disponible. Los cambios confirmados en tu cuenta se conservan en el servidor.</p>}
      {checkedAt && <p className="subtle" role="status">Fuentes comprobadas el {date(checkedAt)}. Las becas se comparan con el catálogo verificado de EduPlan; consulta su fuente oficial para confirmar vigencia.</p>}
      {saved.length ? <ul className="saved-list">{saved.map(item=><li key={item.id}><div className="saved-summary"><Link to={item.href}>{item.name}</Link>{date(item.savedAt) && <small className="subtle">Guardado el {date(item.savedAt)}</small>}{updates[item.id]?.state === 'changed' && <div className="notice"><strong>La información publicada cambió.</strong><ul>{updates[item.id].changes.map(change=><li key={change.key}>{change.label}: {change.before || 'No disponible'} → {change.after}</li>)}</ul><button className="text-link plain-button" type="button" onClick={()=>acceptUpdate(item)}>Actualizar resumen guardado</button></div>}{updates[item.id]?.state === 'missing' && <p role="status">Este registro ya no aparece en la consulta actual. Confirma su disponibilidad con la fuente oficial.</p>}{updates[item.id]?.state === 'same' && <small className="subtle">Sin cambios en los datos que pudimos comprobar.</small>}{['error','unverified'].includes(updates[item.id]?.state) && <small role="status">No pudimos comprobar este resumen. Abre su detalle o consulta la fuente oficial.</small>}</div><button type="button" disabled={syncState === 'loading'} className="text-link plain-button" aria-label={`Quitar ${item.name} de guardados`} onClick={()=>removeSaved(item.id)}>Quitar</button></li>)}</ul> : syncState !== 'loading' && <p>Aún no has guardado opciones. Puedes hacerlo desde programas, instituciones o becas.</p>}</section>
    <section className="dashboard-section cta-panel"><h2>Completa tus intereses</h2><label htmlFor="interest-progress">Intereses completados: {progress} %</label><progress id="interest-progress" max="100" value={progress} /><p>Selecciona áreas y motivaciones para organizar tu exploración. Todavía no se generan recomendaciones.</p><Link className="btn btn-primary" to="/perfil">Ir a mi perfil</Link></section>
  </div></main>;
}
