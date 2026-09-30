import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { useProfileInterests, areas, motivations } from '../hooks/useProfileInterests';
import { sufficientPreferences } from '../utils/preferences';
import SectionTabs from '../components/SectionTabs';
import UserAvatar from '../components/UserAvatar';
import AccountSettings from '../components/AccountSettings';
import { useLocalAvatar } from '../hooks/useLocalAvatar';
import { compressAvatar } from '../utils/avatar';
import AcademicPreferencesForm from '../components/AcademicPreferencesForm';

const sections = [
  ['perfil', 'Perfil'], ['preferencias', 'Preferencias académicas'],
  ['intereses', 'Intereses'], ['resultados', 'Resultados'], ['cuenta', 'Cuenta'],
];

export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const selected = sections.find(([key]) => key === params.get('seccion')) || sections[0];
  const tab = selected[1];
  const { user } = useAuth();
  const academic = useAcademicProfile();
  const { selections, toggle, save, message, progress, syncState, retrySync } = useProfileInterests();
  const { photo, setPhoto } = useLocalAvatar(user);
  const input = useRef(null);
  const [photoMessage, setPhotoMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  function changeTab(label) {
    const key = sections.find(([, text]) => text === label)?.[0];
    setParams(key === 'perfil' ? {} : { seccion: key }, { replace: true });
  }
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setProcessing(true); setPhotoMessage('');
    try { setPhoto(await compressAvatar(file)); setPhotoMessage('Foto guardada en este dispositivo.'); }
    catch (error) { setPhotoMessage(error.message); }
    finally { setProcessing(false); }
  }
  function removePhoto() {
    try { setPhoto(''); setPhotoMessage('Foto eliminada de este dispositivo.'); }
    catch (error) { setPhotoMessage(error.message); }
  }
  const ready = academic.state === 'ready' && sufficientPreferences(academic.preferences, academic.interests);

  return <main className="page profile-page"><div className="container profile-shell">
    <div className="profile-intro"><p className="eyebrow">Tu información y preferencias</p><h1>Mi perfil</h1><p>Gestiona tus datos, cuéntanos qué buscas y revisa cómo se crean tus resultados.</p><Link className="text-link" to="/dashboard">Volver a Mi espacio →</Link></div>
    <header className="profile-hero surface">
      <UserAvatar name={user.name} photo={photo} large />
      <div className="profile-hero-copy"><p className="eyebrow">Cuenta personal</p><h2>{user.name}</h2><p>{user.email}</p><div className="profile-photo-actions"><input ref={input} className="sr-only" type="file" id="profile-photo" aria-label="Subir foto de perfil" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={processing} /><button className="btn btn-secondary" type="button" disabled={processing} onClick={() => input.current?.click()}>{processing ? 'Procesando foto…' : photo ? 'Cambiar foto' : 'Subir foto'}</button>{photo && <button className="plain-button text-link" type="button" disabled={processing} onClick={removePhoto}>Eliminar foto</button>}</div><small className="subtle">JPG, PNG o WebP · Hasta 5 MB · Solo en este dispositivo</small>{photoMessage && <p className="photo-message" role="status">{photoMessage}</p>}</div>
      <div className="profile-hero-progress"><span>Perfil académico</span><strong>{academic.state === 'ready' ? `${academic.completeness}%` : '—'}</strong><p>{academic.state !== 'ready' ? 'Consultando tu progreso…' : academic.completeness === 100 ? 'Tus datos están completos. Puedes ajustarlos cuando quieras.' : 'Completa intereses y preferencias para afinar tu orientación.'}</p>{academic.state === 'ready' && <progress aria-label="Completitud del perfil académico" max="100" value={academic.completeness} />}</div>
    </header>
    <SectionTabs items={sections.map(([, label]) => label)} value={tab} onChange={changeTab} label="Secciones del perfil">
      <div className="profile-tab-content">
        {tab === 'Perfil' && <div className="profile-content-stack"><section className="profile-panel surface"><p className="eyebrow">Vista general</p><h2>Tu punto de partida</h2><p>Este es el lugar para mantener al día tu información. Lo que guardas y exploras vive en <Link className="text-link" to="/dashboard">Mi espacio</Link>.</p><div className="profile-overview-grid"><Link to="?seccion=cuenta" className="profile-overview-item"><span>01 · Identidad</span><strong>Datos de cuenta</strong><small>Nombre y teléfono editables; correo de acceso en lectura.</small></Link><Link to="?seccion=preferencias" className="profile-overview-item"><span>02 · Objetivos</span><strong>Preferencias académicas</strong><small>Nivel, modalidad y ubicación que buscas.</small></Link><Link to="?seccion=intereses" className="profile-overview-item"><span>03 · Afinidades</span><strong>Intereses</strong><small>Áreas y motivaciones que te representan.</small></Link></div></section></div>}
        {tab === 'Preferencias académicas' && <AcademicPreferencesForm />}
        {tab === 'Intereses' && <div className="profile-content-stack"><div className="profile-section-heading"><div><p className="eyebrow">Tus afinidades</p><h2>Intereses y motivaciones</h2><p>Elige todas las opciones que te identifiquen. Las áreas ayudan a personalizar resultados; las motivaciones completan tu perfil.</p></div><span className="profile-step">Intereses: {progress}%</span></div>{syncState === 'loading' && <p role="status">Cargando intereses de tu cuenta…</p>}
          {[['areas', 'Áreas que te interesan', '¿Qué temas te gustaría estudiar o explorar?', areas], ['motivations', '¿Qué te motiva?', 'Puedes seleccionar más de una razón.', motivations]].map(([group, title, description, values]) => <section className="profile-panel surface interest-choice-panel" key={group}><div className="interest-panel-heading"><div><h3>{title}</h3><p>{description}</p></div><span>{selections[group].length} seleccionadas</span></div><div className="choice-grid">{values.map(value => <button className="choice" type="button" key={value} disabled={syncState === 'loading' || syncState === 'saving'} aria-pressed={selections[group].includes(value)} onClick={() => toggle(group, value)}>{value}</button>)}</div></section>)}
          <div className="profile-form-footer interests-footer"><span className="subtle" role="status">{message || 'Tus cambios se guardan en tu cuenta al pulsar el botón.'}</span><button className="btn btn-primary" type="button" disabled={syncState === 'loading' || syncState === 'saving' || message === 'Intereses guardados en tu cuenta.'} onClick={save}>{syncState === 'saving' ? 'Guardando…' : 'Guardar intereses'}</button></div>{syncState === 'error' && <button className="btn btn-secondary" type="button" onClick={retrySync}>Reintentar sincronización</button>}</div>}
        {tab === 'Resultados' && <section className="profile-panel surface profile-results"><p className="eyebrow">Orientación personalizada</p><h2>{ready ? 'Ya puedes explorar tus recomendaciones' : 'Primero, construyamos tu perfil'}</h2><p>{ready ? 'Comparamos tus intereses, nivel, modalidad y ubicación con ofertas académicas verificadas. La puntuación orienta; no predice admisión ni empleabilidad.' : 'Para generar recomendaciones necesitas al menos un área de interés y el nivel académico que buscas. Si limitas la ubicación, indica ciudad o departamento.'}</p><div className="profile-result-actions"><Link className="btn btn-primary" to={ready ? '/recomendaciones' : '/perfil?seccion=preferencias'}>{ready ? 'Ver recomendaciones' : 'Completar preferencias'}</Link>{!ready && <Link className="text-link" to="/perfil?seccion=intereses">Elegir intereses →</Link>}</div></section>}
        {tab === 'Cuenta' && <AccountSettings />}
      </div>
    </SectionTabs>
  </div></main>;
}
