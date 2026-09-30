import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfileInterests, areas, motivations } from '../hooks/useProfileInterests';
import SectionTabs from '../components/SectionTabs';
import UserAvatar from '../components/UserAvatar';
import { useLocalAvatar } from '../hooks/useLocalAvatar';
import { compressAvatar } from '../utils/avatar';
import AcademicPreferencesForm from '../components/AcademicPreferencesForm';
const tabs = ['Perfil','Preferencias académicas','Mis intereses','Resultados','Configuración'];
export default function ProfilePage() {
  const [tab,setTab] = useState('Mis intereses'); const { user, logout } = useAuth(); const { selections,toggle,save,message,progress,syncState,retrySync } = useProfileInterests();
  const { photo, setPhoto } = useLocalAvatar(user);
  const input = useRef(null), [photoMessage, setPhotoMessage] = useState(''), [processing, setProcessing] = useState(false);
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setProcessing(true); setPhotoMessage('');
    try { setPhoto(await compressAvatar(file)); setPhotoMessage('Foto guardada para tu cuenta en este dispositivo.'); }
    catch (error) { setPhotoMessage(error.message); }
    finally { setProcessing(false); }
  }
  function removePhoto() { try { setPhoto(''); setPhotoMessage('Foto eliminada de este dispositivo.'); } catch (error) { setPhotoMessage(error.message); } }
  return <main className="page profile-page"><div className="container"><header className="identity-header profile-identity"><UserAvatar name={user.name} photo={photo} large /><div><p className="eyebrow">Mi perfil</p><h1>{user.name}</h1><p>{user.email}</p><div className="profile-photo-actions"><input ref={input} className="sr-only" type="file" id="profile-photo" aria-label="Subir foto de perfil" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={processing} /><button className="btn btn-secondary" type="button" disabled={processing} onClick={() => input.current.click()}>{processing ? 'Procesando foto…' : photo ? 'Cambiar foto' : 'Subir foto'}</button>{photo && <button className="plain-button text-link" type="button" disabled={processing} onClick={removePhoto}>Eliminar foto</button>}</div><small className="subtle">JPG, PNG o WebP · Hasta 5 MB. Solo en este dispositivo, para tu cuenta.</small>{photoMessage && <p className="photo-message" role="status">{photoMessage}</p>}</div></header><SectionTabs items={tabs} value={tab} onChange={setTab} label="Secciones del perfil">
    {tab === 'Mis intereses' ? <><p className="subtle">Tus intereses se guardan en tu cuenta y puedes recuperarlos al iniciar sesión en otro dispositivo.</p>{syncState === 'loading' && <p role="status">Cargando intereses de tu cuenta…</p>}<p>Intereses completados: {progress} %</p>{[['areas','Áreas que te interesan',areas],['motivations','¿Qué te motiva?',motivations]].map(([group,title,values])=><section className="profile-panel surface" key={group}><h2>{title}</h2><div className="choice-grid">{values.map(value=><button className="choice" type="button" key={value} disabled={syncState === 'loading' || syncState === 'saving'} aria-pressed={selections[group].includes(value)} onClick={()=>toggle(group,value)}>{value}</button>)}</div></section>)}<button className="btn btn-primary" type="button" disabled={syncState === 'loading' || syncState === 'saving'} onClick={save}>{syncState === 'saving' ? 'Guardando…' : 'Guardar intereses'}</button>{message && <p role="status">{message}</p>}{syncState === 'error' && <button className="btn btn-secondary" type="button" onClick={retrySync}>Reintentar sincronización</button>}</>
    : tab === 'Preferencias académicas' ? <AcademicPreferencesForm />
    : tab === 'Perfil' ? <section className="profile-panel"><h2>Datos de tu cuenta</h2><dl><dt>Nombre</dt><dd>{user.name}</dd><dt>Correo</dt><dd>{user.email}</dd></dl><p>La edición de datos de cuenta estará disponible en una etapa posterior.</p></section>
    : tab === 'Resultados' ? <section className="profile-panel profile-results"><p className="eyebrow">Tu orientación</p><h2>Explora según tus preferencias</h2><p>Las recomendaciones usan intereses y datos del catálogo. No constituyen una evaluación vocacional.</p><Link className="btn btn-primary" to="/recomendaciones">Ver mis recomendaciones</Link></section>
    : <section className="profile-panel"><h2>Configuración de cuenta</h2><dl><dt>Nombre</dt><dd>{user.name}</dd><dt>Correo</dt><dd>{user.email}</dd></dl><p>Información de solo lectura. Tus guardados e intereses permanecen asociados a tu cuenta al cerrar sesión. La foto permanece únicamente en este dispositivo.</p><button className="btn btn-secondary" type="button" onClick={logout}>Cerrar sesión</button></section>}
  </SectionTabs></div></main>;
}
