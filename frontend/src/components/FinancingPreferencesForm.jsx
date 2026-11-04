import { useEffect, useRef, useState } from 'react';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { emptyFinancingPreferences } from '../utils/financing';
import '../styles/scholarship-personalization.css';

const questions = [
  ['studentStage', '¿En qué etapa está el programa que quieres financiar?', [['entry', 'Voy a ingresar al programa'], ['enrolled', 'Ya estoy matriculado en ese programa']], 'Aplica también a posgrados: distingue ingreso y apoyos durante el programa.'],
  ['support', '¿Qué apoyo buscas principalmente?', [['tuition', 'Matrícula'], ['living', 'Sostenimiento'], ['mobility', 'Movilidad académica']], 'Se compara con la cobertura publicada por cada entidad.'],
  ['repayment', '¿Qué prefieres sobre la devolución?', [['no', 'Prefiero apoyos sin crédito ni aportes financieros'], ['accepted', 'También consideraría financiación con devolución']], 'Los créditos condonables pueden exigir pagos si no cumples sus condiciones.'],
  ['international', '¿Te interesa estudiar en el exterior?', [['yes', 'Sí, quiero considerar el exterior'], ['no', 'Prefiero estudiar en Colombia']], 'Permite priorizar movilidad y financiación internacional.'],
  ['admission', '¿Ya tienes admisión a alguna institución?', [['yes', 'Sí, tengo admisión'], ['no', 'Todavía no']], 'Una respuesta afirmativa no acredita admisión al programa específico exigido por una convocatoria.'],
  ['nationality', 'Nacionalidad para consultar requisitos', [['Colombianos', 'Soy colombiano/a'], ['Extranjeros', 'Soy extranjero/a']], 'Opcional. Se usa solo para distinguir convocatorias dirigidas a colombianos o extranjeros.'],
];
const equal = (a, b) => Object.keys(emptyFinancingPreferences).every(key => a[key] === b[key]);

export default function FinancingPreferencesForm() {
  const profile = useAcademicProfile();
  const [draft, setDraft] = useState(() => ({ ...profile.financing }));
  const [saving, setSaving] = useState(false), [feedback, setFeedback] = useState(null);
  const previous = useRef(profile.financing), controller = useRef(null), section = useRef(null);
  useEffect(() => { if (window.location.hash === '#apoyo') section.current?.scrollIntoView({ block: 'start' }); }, []);
  useEffect(() => {
    const old = previous.current; previous.current = profile.financing;
    setDraft(current => equal(current, old) ? { ...profile.financing } : current);
  }, [profile.financing]);
  useEffect(() => () => controller.current?.abort(), []);
  async function save(event) {
    event.preventDefault(); setSaving(true); setFeedback(null);
    const request = new AbortController(); controller.current = request;
    try {
      await profile.saveFinancing(draft, request.signal);
      if (!request.signal.aborted) setFeedback({ text: 'Preferencias de financiación guardadas. Tus oportunidades ya se actualizaron.', error: false });
    } catch (error) { if (!request.signal.aborted) setFeedback({ text: error.message, error: true }); }
    finally { if (!request.signal.aborted) setSaving(false); }
  }
  return <section className="financing-profile" id="apoyo" aria-labelledby="financing-title" ref={section}>
    <header><p className="eyebrow">Tu perfil · Apoyo educativo</p><h2 id="financing-title">Apoyo para tus estudios</h2><p>Estas respuestas son opcionales. Usamos el nivel y lugar de estudio que ya elegiste arriba; aquí puedes precisar qué financiación buscas.</p></header>
    {profile.financingState === 'loading' ? <p role="status">Consultando tus preferencias de financiación…</p> : profile.financingState === 'error' ? <div role="alert"><p>{profile.financingError}</p><button className="btn btn-secondary" type="button" onClick={profile.reloadFinancing}>Reintentar preferencias de financiación</button></div> : <form onSubmit={save}>
      <fieldset className="financing-question-grid" disabled={saving}>{questions.map(([field, label, options, help]) => <label className="financing-question" key={field} htmlFor={`finance-${field}`}>{label}<select id={`finance-${field}`} value={draft[field]} aria-describedby={`finance-help-${field}`} onChange={event => { setDraft(current => ({ ...current, [field]: event.target.value })); setFeedback(null); }}><option value="">Prefiero no responder / aún no sé</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select><span id={`finance-help-${field}`}>{help}</span></label>)}</fieldset>
      <div className="financing-save"><p>Se guardan en tu cuenta. Puedes dejarlas en blanco y seguir explorando todas las becas.</p><button className="btn btn-primary" type="submit" disabled={saving || equal(draft, profile.financing)}>{saving ? 'Guardando…' : 'Guardar preferencias de apoyo'}</button></div>
      {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    </form>}
  </section>;
}
