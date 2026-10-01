import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAcademicProfile} from '../../contexts/AcademicProfileContext';
import {matchingConfig as config,relatedNbcs,refinementProgress} from '../../utils/matching';
import ProfileSection from './ProfileSection';
import ProfileIcon from './ProfileIcon';

function Chips({options,value,onChange,limit=8,disabled,exclude=[]}) {
  return <div className="interest-chips refinement-chips">{options.map(option=><button type="button" key={option} disabled={disabled||exclude.includes(option)||!value.includes(option)&&value.length>=limit} aria-pressed={value.includes(option)} onClick={()=>onChange(value.includes(option)?value.filter(v=>v!==option):[...value,option])}>{value.includes(option)&&<ProfileIcon name="check"/>}{option}</button>)}</div>;
}
function Choice({id,label,value,options,onChange,disabled,placeholder='No estoy seguro'}) {
  return <div className="academic-field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}><option value="">{placeholder}</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></div>;
}
export default function RefinementForm(){
  const profile=useAcademicProfile(),[draft,setDraft]=useState(profile.refinement),[saving,setSaving]=useState(false),[feedback,setFeedback]=useState(null),[allNbcs,setAllNbcs]=useState(false);
  const controller=useRef(null),previous=useRef(profile.refinement);
  useEffect(()=>{const old=previous.current;previous.current=profile.refinement;setDraft(current=>JSON.stringify(current)===JSON.stringify(old)?profile.refinement:current);},[profile.refinement]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const dirty=JSON.stringify(draft)!==JSON.stringify(profile.refinement),progress=refinementProgress(draft,profile.preferences,profile.interests.motivations);
  const local=['CITY','DEPARTMENT'].includes(profile.preferences.mobility),hasModality=Boolean(profile.preferences.modality);
  const legacy=profile.interests.motivations.filter(m=>config.activities.some(a=>a.label===m));
  const related=relatedNbcs(profile.interests.areas),options=allNbcs||!related.length?config.nbcs:related;
  function change(field,value){setDraft(current=>({...current,[field]:value,...(field==='excludedNbcs'?{exclusionsReviewed:true}:{})}));setFeedback(null);}
  async function save(event){event.preventDefault();setSaving(true);setFeedback(null);const request=new AbortController();controller.current=request;
    try{await profile.saveRefinement(draft,request.signal);if(!request.signal.aborted)setFeedback({text:'Tu afinación está guardada. Tus recomendaciones ya usan estas respuestas.'});}
    catch(error){if(!request.signal.aborted)setFeedback({error:true,text:error.message});}
    finally{if(!request.signal.aborted)setSaving(false);}
  }
  if(profile.state==='loading')return <p role="status">Cargando tus respuestas…</p>;
  if(profile.state==='error')return <div role="alert"><p>{profile.error}</p><button className="btn btn-secondary" onClick={profile.reload}>Volver a intentar</button></div>;
  return <section className="refinement-panel" id="refinement" aria-labelledby="refinement-title">
    <header className="refinement-heading"><div><p className="eyebrow">Tus preferencias, con más detalle</p><h2 id="refinement-title">Afina tus recomendaciones</h2><p>Puedes responder solo lo que tengas claro y volver a cambiarlo.</p></div><span className="refinement-progress" role="status">{progress.answered} de {progress.total} preguntas aplicables</span></header>
    <form onSubmit={save}><fieldset className="academic-steps refinement-steps" disabled={saving}>
      <ProfileSection number="1" title="Qué temas quieres explorar" description="Elige hasta ocho núcleos básicos de conocimiento (NBC) del catálogo. Así distinguimos áreas cercanas que te interesan de otras opciones.">
        <p className="field-help">Partimos de las áreas de tu perfil. El nombre de cada NBC viene del catálogo.</p>
        <Chips options={options.map(n=>n.name)} value={draft.specificNbcs} onChange={value=>change('specificNbcs',value)} exclude={draft.excludedNbcs}/>
        {related.length>0&&<button className="text-link plain-button" type="button" onClick={()=>setAllNbcs(v=>!v)}>{allNbcs?'Mostrar los relacionados con mis áreas':'Ver todos los NBC del catálogo'}</button>}
        {draft.specificNbcs.filter(n=>!options.some(o=>o.name===n)).map(n=><button type="button" className="refinement-hidden-choice" key={n} onClick={()=>change('specificNbcs',draft.specificNbcs.filter(v=>v!==n))}>✓ {n} · Quitar</button>)}
      </ProfileSection>
      <ProfileSection number="2" title="Qué disfrutas hacer" description="Estas actividades orientan el orden de las opciones; no miden tus capacidades.">
        {legacy.length>0&&<p className="field-help">Ya contamos tus motivaciones guardadas: {legacy.join(', ')}. Puedes cambiarlas en <Link to="/perfil">Perfil académico</Link>.</p>}
        <Chips options={config.activities.map(a=>a.label).filter(a=>!legacy.includes(a))} value={draft.activities} onChange={value=>change('activities',value)}/>
      </ProfileSection>
      <ProfileSection number="3" title="En qué contexto te gustaría aprender" description="Puedes elegir varios. Los relacionamos con los NBC mediante una configuración editorial que puedes consultar en tus resultados.">
        <Chips options={config.contexts.map(a=>a.label)} value={draft.contexts} onChange={value=>change('contexts',value)} limit={5}/>
      </ProfileSection>
      <ProfileSection number="4" title="Qué tan importante es el lugar" description="Indispensable limita la búsqueda. Las otras opciones permiten programas fuera de tu ubicación elegida.">
        {local?<><p className="field-help">Tu ubicación: {profile.preferences.mobility==='CITY'?profile.preferences.municipality:profile.preferences.department}.</p><Choice id="refine-location" label="Importancia de la ubicación" value={draft.locationImportance} options={config.locationPriorities} onChange={value=>change('locationImportance',value)} placeholder="Indispensable por ahora"/></>:<p className="field-help">Tu perfil permite buscar en todo Colombia. No necesitas priorizar una ciudad; puedes elegirla en <Link to="/perfil">Perfil académico</Link>.</p>}
      </ProfileSection>
      <ProfileSection number="5" title="Qué tan importante es la modalidad" description="Puedes exigir la modalidad elegida, darle prioridad o explorar todas por igual.">
        {hasModality?<><p className="field-help">Tu modalidad: {profile.preferences.modality}.</p><Choice id="refine-modality" label="Importancia de la modalidad" value={draft.modalityImportance} options={config.modalityPriorities} onChange={value=>change('modalityImportance',value)} placeholder="La prefiero por ahora"/></>:<p className="field-help">No elegiste una modalidad. Puedes definirla en <Link to="/perfil">Perfil académico</Link> cuando lo tengas claro.</p>}
      </ProfileSection>
      <ProfileSection number="6" title="Cuánto tiempo te gustaría estudiar" description="Usamos cantidad de periodos y periodicidad publicada. Si esos datos son ambiguos, lo indicamos sin inventar una duración.">
        <Choice id="refine-duration" label="Duración preferida" value={draft.duration} options={config.durationOptions} onChange={value=>change('duration',value)} placeholder="Sin preferencia"/>
      </ProfileSection>
      <ProfileSection number="7" title="Qué tipo de institución prefieres" description="Es una preferencia suave. No evalúa calidad, prestigio ni costos.">
        <Choice id="refine-sector" label="Sector institucional" value={draft.sector} options={config.sectorOptions} onChange={value=>change('sector',value)} placeholder="Sin preferencia"/>
      </ProfileSection>
      <ProfileSection number="8" title="Qué temas prefieres dejar fuera" description="Los NBC que selecciones se excluyen de tus recomendaciones. Puedes quitarlos cuando quieras.">
        <details className="refinement-exclusions"><summary>Elegir NBC que no quiero explorar{draft.excludedNbcs.length>0?` (${draft.excludedNbcs.length})`:''}</summary><Chips options={config.nbcs.map(n=>n.name)} value={draft.excludedNbcs} onChange={value=>change('excludedNbcs',value)} exclude={draft.specificNbcs}/></details>
        <label className="refinement-checkbox"><input type="checkbox" checked={draft.exclusionsReviewed&&draft.excludedNbcs.length===0} onChange={e=>{change('excludedNbcs',[]);change('exclusionsReviewed',e.target.checked);}}/>No quiero excluir ningún NBC</label>
      </ProfileSection>
    </fieldset><div className="refinement-save"><p className="field-help">{dirty?'Hay respuestas sin guardar.':'El progreso cuenta preferencias específicas; no es una puntuación de compatibilidad.'}</p><button className="btn btn-primary" disabled={!dirty||saving} type="submit">{saving?'Guardando…':'Guardar afinación'}<ProfileIcon name="arrow"/></button></div>
      {feedback&&<p className={`academic-feedback ${feedback.error?'is-error':''}`} role={feedback.error?'alert':'status'}>{feedback.text} {!feedback.error&&<Link to="/recomendaciones">Ver mis recomendaciones →</Link>}</p>}
    </form>
  </section>;
}
