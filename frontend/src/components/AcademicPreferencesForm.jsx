import {formationOptions} from '../utils/matching';
import { useEffect, useRef, useState } from 'react';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { useProfileInterests } from '../hooks/useProfileInterests';
import { levels, modalities } from '../utils/preferences';
import { changeLocation, coherentPreferences, validLocation } from '../utils/profile-location';
import ProfileSection from './profile/ProfileSection';
import LocationPreference from './profile/LocationPreference';
import InterestSelector from './profile/InterestSelector';
import ProfileCompletion from './profile/ProfileCompletion';
import ProfileRecommendationsPreview from './profile/ProfileRecommendationsPreview';
import ProfileIcon from './profile/ProfileIcon';

const same = (a, b) => ['academicLevel', 'educationLevel', 'modality', 'mobility', 'department', 'municipality'].every(key => a[key] === b[key]);
export default function AcademicPreferencesForm() {
  const academic = useAcademicProfile();
  const interests = useProfileInterests();
  const [draft, setDraft] = useState(() => coherentPreferences(academic.preferences));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const previous = useRef(academic.preferences);
  const controller = useRef(null);
  useEffect(() => {
    const old = coherentPreferences(previous.current);
    previous.current = academic.preferences;
    setDraft(current => same(current, old) ? coherentPreferences(academic.preferences) : current);
  }, [academic.preferences]);
  useEffect(() => () => controller.current?.abort(), []);

  const changedPreferences = !same(draft, academic.preferences);
  const changedInterests = ['areas', 'motivations'].some(key => JSON.stringify(interests.selections[key]) !== JSON.stringify(academic.interests[key]));
  const dirty = changedPreferences || changedInterests;
  const busy = saving || interests.syncState === 'loading' || interests.syncState === 'saving';
  const invalidLegacyLocation = academic.preferences.municipality && !coherentPreferences(academic.preferences).municipality && academic.preferences.mobility === 'CITY';
  function change(field, value) {
    setDraft(current => field === 'academicLevel' ? {...current,academicLevel:value,educationLevel:''} : ['mobility', 'department', 'municipality'].includes(field) ? changeLocation(current, field, value) : { ...current, [field]: value });
    setFeedback(null);
  }
  async function save(event) {
    event.preventDefault();
    if (draft.mobility && !validLocation(draft)) { setFeedback({ error: true, text: 'Elige una ubicación para completar esta sección.' }); return; }
    setSaving(true); setFeedback(null);
    const request = new AbortController(); controller.current = request;
    let preferencesSaved = false;
    try {
      if (changedPreferences) await academic.savePreferences(draft, request.signal);
      preferencesSaved = true;
      if (changedInterests || interests.syncState === 'error') {
        const saved = await interests.save();
        if (!saved) throw new Error('Tus preferencias están guardadas. Los intereses siguen pendientes; vuelve a guardar para reintentarlo.');
      }
      if (!request.signal.aborted) setFeedback({ error: false, text: 'Tu perfil académico está guardado. Ya puedes explorar tus recomendaciones.' });
    } catch (error) {
      if (!request.signal.aborted) setFeedback({ error: true, text: preferencesSaved ? error.message : 'No pudimos guardar tus preferencias. Tus cambios siguen aquí; inténtalo de nuevo.' });
    } finally { if (!request.signal.aborted) setSaving(false); }
  }

  if (academic.state === 'loading') return <div className="profile-loading" role="status">Preparando tu perfil académico…</div>;
  if (academic.state === 'error') return <div className="profile-loading" role="alert"><p>{academic.error}</p><button className="btn btn-secondary" type="button" onClick={academic.reload}>Volver a intentar</button></div>;
  return <div className="academic-profile-layout">
    <div className="academic-profile-main">
      <header className="profile-page-heading"><p className="eyebrow">Un paso más cerca de tu futuro</p><h1>Tu perfil académico</h1><p>Cuéntanos qué te interesa. Encontraremos programas que encajen con lo que buscas.</p></header>
      <form className="academic-profile-form" onSubmit={save}>
        <fieldset className="academic-steps" disabled={busy}>
          <ProfileSection number="1" title="Meta académica" description="Empieza por el nivel de formación que quieres explorar.">
            <label className="academic-field" htmlFor="pref-academicLevel">Nivel académico<span className="profile-input"><ProfileIcon name="academic"/><select id="pref-academicLevel" name="academicLevel" value={draft.academicLevel} onChange={event => change('academicLevel', event.target.value)}><option value="">No estoy seguro</option>{levels.map(value => <option key={value}>{value}</option>)}</select></span></label>
            <div className="academic-field"><label htmlFor="pref-educationLevel">Tipo de formación</label><select id="pref-educationLevel" name="educationLevel" value={draft.educationLevel || ''} disabled={!draft.academicLevel} onChange={event=>change('educationLevel',event.target.value)}><option value="">No estoy seguro</option>{formationOptions(draft.academicLevel).map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select><p className="field-help">Si eliges un tipo, buscaremos programas de esa formación.</p></div>
            <p className="academic-hint"><ProfileIcon name="info"/>{draft.academicLevel ? `Te mostraremos opciones de ${draft.academicLevel.toLowerCase()} afines a tus intereses.` : 'Esta respuesta nos ayuda a encontrar programas en la etapa que buscas.'}</p>
          </ProfileSection>
          <ProfileSection number="2" title="Dónde te gustaría estudiar" description="Elige qué tan cerca o lejos quieres buscar.">
            <LocationPreference value={draft} importance={academic.refinement.locationImportance} onChange={change}/>
            {invalidLegacyLocation && <p className="field-help location-repair">Revisa tu ciudad: la ubicación anterior no coincidía con el departamento.</p>}
          </ProfileSection>
          <ProfileSection number="3" title="Cómo prefieres estudiar" description="Elige la modalidad que mejor se adapta a ti.">
            <label className="academic-field" htmlFor="pref-modality">Modalidad de estudio<span className="profile-input"><ProfileIcon name="study"/><select id="pref-modality" name="modality" value={draft.modality} onChange={event => change('modality', event.target.value)}><option value="">Aún no tengo preferencia</option>{modalities.map(value => <option key={value} value={value}>{value === 'Presencial-Virtual' ? 'Híbrida · presencial y virtual' : value}</option>)}</select></span></label>
            <p className="field-help">Daremos prioridad a esta modalidad sin dejar fuera otras opciones.</p>
          </ProfileSection>
          <ProfileSection number="4" title="Intereses y afinidades" description="Marca los temas y actividades con los que te identificas.">
            <InterestSelector selections={interests.selections} disabled={busy} toggle={(group, value) => { interests.toggle(group, value); setFeedback(null); }}/>
          </ProfileSection>
        </fieldset>
        <div className="academic-save-bar"><div className="academic-save-note"><ProfileIcon name={feedback?.error ? 'info' : 'check'}/><div><strong>{dirty ? 'Tu siguiente paso empieza aquí' : 'Tu información está al día'}</strong><span>{dirty ? 'Guarda tus respuestas para personalizar tus opciones.' : 'Puedes ajustar tus respuestas cuando quieras.'}</span></div></div><button className="btn btn-primary" type="submit" disabled={busy || (!dirty && interests.syncState !== 'error')}>{saving ? 'Guardando…' : 'Guardar perfil'}<ProfileIcon name="arrow"/></button></div>
        {feedback && <p className={`academic-feedback ${feedback.error ? 'is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
        {!feedback && interests.syncState === 'error' && <p className="academic-feedback is-error" role="alert">{interests.message} <button className="plain-button text-link" type="button" onClick={interests.retrySync}>Volver a cargar intereses</button></p>}
      </form>
    </div>
    <aside className="academic-profile-aside"><ProfileCompletion preferences={draft} interests={interests.selections} dirty={dirty}/><ProfileRecommendationsPreview dirty={dirty}/></aside>
  </div>;
}
