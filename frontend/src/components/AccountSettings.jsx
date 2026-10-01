import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAccount, putAccount } from '../services/account';
import ProfileIcon from './profile/ProfileIcon';
import ProfilePhotoSettings from './profile/ProfilePhotoSettings';

export default function AccountSettings() {
  const { user, token, updateUser, logout } = useAuth();
  const [draft, setDraft] = useState({ name: user.name, phone: user.phone || '' });
  const [state, setState] = useState('loading');
  const [feedback, setFeedback] = useState(null);
  const [retry, setRetry] = useState(0);
  const saveRequest = useRef(null);
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    getAccount(token, controller.signal).then(account => {
      if (controller.signal.aborted) return;
      setDraft({ name: account.name, phone: account.phone || '' });
      updateUser(account); setState('ready');
    }).catch(error => {
      if (!controller.signal.aborted) { setState('error'); setFeedback({ error: true, text: error.message }); }
    });
    return () => controller.abort();
  }, [token, retry]);
  useEffect(() => () => saveRequest.current?.abort(), []);
  const changed = draft.name.trim() !== user.name || draft.phone.trim() !== (user.phone || '');
  function change(field, value) { setDraft(current => ({ ...current, [field]: value })); setFeedback(null); }
  async function save(event) {
    event.preventDefault(); setState('saving'); setFeedback(null);
    const controller = new AbortController(); saveRequest.current = controller;
    try {
      const account = await putAccount({ name: draft.name.trim(), phone: draft.phone.trim() }, token, controller.signal);
      if (controller.signal.aborted) return;
      updateUser(account); setDraft({ name: account.name, phone: account.phone || '' });
      setState('ready'); setFeedback({ error: false, text: 'Tus datos están guardados.' });
    } catch (error) { if (!controller.signal.aborted) { setState('ready'); setFeedback({ error: true, text: error.message }); } }
  }
  return <div className="account-settings">
    <section className="account-details-card"><header className="profile-page-heading"><p className="eyebrow">Configuración de cuenta</p><h1>Tu información</h1><p>Mantén tus datos al día. Esta información se usa en tu cuenta de EduPlan.</p></header>
      {state === 'loading' ? <p role="status">Cargando tus datos…</p> : state === 'error' ? <div role="alert"><p>{feedback?.text}</p><button className="btn btn-secondary" type="button" onClick={() => setRetry(value => value + 1)}>Volver a intentar</button></div> : <form className="account-form" onSubmit={save}>
        <label className="academic-field" htmlFor="account-name">Nombre completo<span className="profile-input"><ProfileIcon name="user"/><input id="account-name" name="name" autoComplete="name" value={draft.name} required maxLength={120} onChange={event => change('name', event.target.value)} disabled={state === 'saving'}/></span></label>
        <label className="academic-field" htmlFor="account-phone"><span>Teléfono <span className="optional-label">Opcional</span></span><span className="profile-input"><ProfileIcon name="phone"/><input id="account-phone" name="phone" type="tel" autoComplete="tel" value={draft.phone} maxLength={30} onChange={event => change('phone', event.target.value)} disabled={state === 'saving'}/></span></label>
        <label className="academic-field" htmlFor="account-email">Correo de acceso<span className="profile-input account-email"><ProfileIcon name="email"/><input id="account-email" type="email" value={user.email} readOnly aria-describedby="account-email-help"/><ProfileIcon name="lock" className="email-lock"/></span></label>
        <p className="field-help" id="account-email-help">El correo de acceso no se puede cambiar desde esta sección.</p>
        <div className="account-save"><span className="field-help">{changed ? 'Tienes cambios sin guardar.' : ''}</span><button className="btn btn-primary" type="submit" disabled={!changed || state === 'saving'}>{state === 'saving' ? 'Guardando…' : 'Guardar cambios'}</button></div>
        {feedback && <p className={`academic-feedback ${feedback.error ? 'is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
      </form>}
      <ProfilePhotoSettings/>
    </section>
    <section className="account-session-card"><h2>Sesión</h2><p>Al salir, tus guardados, intereses y preferencias seguirán en tu cuenta.</p><button className="btn account-signout" type="button" onClick={logout}><ProfileIcon name="logout"/>Cerrar sesión</button></section>
  </div>;
}
