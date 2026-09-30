import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAccount, putAccount } from '../services/account';

export default function AccountSettings() {
  const { user, token, updateUser, logout } = useAuth();
  const [draft, setDraft] = useState({ name: user.name, phone: user.phone || '' });
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAccount(token, controller.signal).then(account => {
      if (controller.signal.aborted) return;
      setDraft({ name: account.name, phone: account.phone || '' });
      updateUser(account);
      setState('ready');
    }).catch(error => {
      if (!controller.signal.aborted) { setState('error'); setMessage(error.message); }
    });
    return () => controller.abort();
  }, [token, retry]);

  const changed = draft.name.trim() !== user.name || draft.phone.trim() !== (user.phone || '');
  async function save(event) {
    event.preventDefault();
    setState('saving'); setMessage('');
    try {
      const account = await putAccount({ name: draft.name.trim(), phone: draft.phone.trim() }, token);
      updateUser(account);
      setDraft({ name: account.name, phone: account.phone || '' });
      setState('ready'); setMessage('Datos de cuenta guardados.');
    } catch (error) { setState('ready'); setMessage(error.message); }
  }

  return <div className="profile-content-stack">
    <section className="profile-panel surface">
      <div className="profile-section-heading"><div><p className="eyebrow">Configuración básica</p><h2>Datos de tu cuenta</h2><p>Actualiza tu nombre y teléfono. El correo de acceso permanece fijo por ahora.</p></div></div>
      {state === 'loading' ? <p role="status">Cargando datos de tu cuenta…</p> : state === 'error' ? <div role="alert"><p>{message}</p><button className="btn btn-secondary" type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : <form className="account-form" onSubmit={save}>
        <label className="field" htmlFor="account-name">Nombre completo · editable<input id="account-name" name="name" value={draft.name} required maxLength={120} onChange={event => { setDraft(value => ({ ...value, name: event.target.value })); setMessage(''); }} disabled={state === 'saving'} /></label>
        <label className="field" htmlFor="account-phone">Teléfono · editable, opcional<input id="account-phone" name="phone" type="tel" value={draft.phone} maxLength={30} onChange={event => { setDraft(value => ({ ...value, phone: event.target.value })); setMessage(''); }} disabled={state === 'saving'} /></label>
        <div className="account-readonly"><span>Correo de acceso · solo lectura</span><strong>{user.email}</strong><small>No se puede cambiar desde esta sección.</small></div>
        <div className="profile-form-footer"><span className="subtle" role="status">{changed ? 'Tienes cambios sin guardar.' : 'Tus datos están actualizados.'}</span><button className="btn btn-primary" type="submit" disabled={!changed || state === 'saving'}>{state === 'saving' ? 'Guardando…' : 'Guardar cambios'}</button></div>
        {message && <p className="profile-feedback" role="status">{message}</p>}
      </form>}
    </section>
    <section className="profile-panel surface account-session"><div><h2>Sesión</h2><p>Al cerrar sesión, tus guardados, intereses y preferencias continúan en tu cuenta. La foto solo permanece en este dispositivo.</p></div><button className="btn btn-secondary" type="button" onClick={logout}>Cerrar sesión</button></section>
  </div>;
}
