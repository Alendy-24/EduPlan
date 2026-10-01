import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalAvatar } from '../../hooks/useLocalAvatar';
import { compressAvatar } from '../../utils/avatar';
import UserAvatar from '../UserAvatar';
export default function ProfilePhotoSettings() {
  const { user } = useAuth();
  const { photo, setPhoto } = useLocalAvatar(user);
  const input = useRef(null);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setProcessing(true); setMessage('');
    try { setPhoto(await compressAvatar(file)); setMessage('Foto guardada en este dispositivo.'); }
    catch (error) { setMessage(error.message); }
    finally { setProcessing(false); }
  }
  function remove() {
    try { setPhoto(''); setMessage('Foto eliminada de este dispositivo.'); }
    catch (error) { setMessage(error.message); }
  }
  return <div className="account-photo"><UserAvatar name={user.name} photo={photo}/><div><strong>Tu foto de cuenta</strong><span>JPG, PNG o WebP · hasta 5 MB<br/>Solo se guarda en este dispositivo.</span><div className="account-photo-actions"><input ref={input} className="sr-only" type="file" id="profile-photo" aria-label="Subir foto de perfil" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={processing}/><button className="text-link plain-button" type="button" disabled={processing} onClick={() => input.current?.click()}>{processing ? 'Procesando…' : photo ? 'Cambiar foto' : 'Subir foto'}</button>{photo && <button className="text-link plain-button" type="button" onClick={remove}>Eliminar foto</button>}</div>{message && <p role="status">{message}</p>}</div></div>;
}
