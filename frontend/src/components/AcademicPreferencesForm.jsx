import { useEffect, useRef, useState } from 'react';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { levels,modalities,mobilities } from '../utils/preferences';
export default function AcademicPreferencesForm() {
  const { preferences,state,error,savePreferences,reload,completeness } = useAcademicProfile();
  const [draft,setDraft] = useState(preferences), [saving,setSaving] = useState(false), [message,setMessage] = useState('');
  const controller = useRef(null);
  const changed = Object.keys(draft).some(key => draft[key] !== preferences[key]);
  useEffect(()=>setDraft(preferences),[preferences]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  function change(event) { setDraft(v=>({...v,[event.target.name]:event.target.value})); setMessage(''); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage('');
    const request = new AbortController(); controller.current = request;
    try { await savePreferences(draft,request.signal); if (!request.signal.aborted) setMessage('Preferencias guardadas en tu cuenta.'); }
    catch(reason) { if (!request.signal.aborted) setMessage(reason.message); }
    finally { if (!request.signal.aborted) setSaving(false); }
  }
  if (state === 'loading') return <p role="status">Cargando tus preferencias…</p>;
  if (state === 'error') return <div role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={reload}>Reintentar</button></div>;
  return <section className="profile-panel surface"><p className="eyebrow">Lo que estás buscando</p><h2>Preferencias académicas</h2><p>Define el nivel, la modalidad y la ubicación que prefieres. Tus respuestas se guardan en tu cuenta y puedes cambiarlas cuando quieras.</p><p className="subtle">Perfil académico: {completeness} % completado. El presupuesto no se usa para calcular compatibilidad.</p>
    <form onSubmit={save} className="academic-preferences"><fieldset disabled={saving}>
      {[['academicLevel','Nivel buscado',levels.map(v=>[v,v])],['modality','Modalidad preferida',modalities.map(v=>[v,v])],['mobility','Disposición geográfica',mobilities]].map(([key,label,options])=><label key={key} htmlFor={`pref-${key}`}>{label}<select id={`pref-${key}`} name={key} value={draft[key]} onChange={change}><option value="">Sin preferencia</option>{options.map(([v,text])=><option key={v} value={v}>{text}</option>)}</select></label>)}
      <label htmlFor="pref-city">Municipio / ciudad<input id="pref-city" name="municipality" maxLength={100} value={draft.municipality} onChange={change} required={draft.mobility==='CITY'} placeholder="Ej. Bogotá" /></label>
      <label htmlFor="pref-department">Departamento<input id="pref-department" name="department" maxLength={100} value={draft.department} onChange={change} required={draft.mobility==='DEPARTMENT'} placeholder="Ej. Antioquia" /></label>
      <p className="subtle">Ciudad y departamento solo restringen los resultados si eliges esa disposición geográfica. La modalidad es una preferencia, no un requisito.</p>
      <div className="profile-form-footer academic-form-footer"><span className="subtle" role="status">{changed ? 'Tienes cambios sin guardar.' : 'Tus preferencias están actualizadas.'}</span><button className="btn btn-primary" type="submit" disabled={!changed || saving}>{saving ? 'Guardando…' : 'Guardar preferencias'}</button></div>
    </fieldset></form>{message && <p role="status">{message}</p>}
  </section>;
}
