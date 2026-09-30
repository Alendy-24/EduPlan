import { useState } from 'react';
import { userInitial } from '../utils/avatar';
export default function UserAvatar({ name, photo, large = false }) {
  const [failed, setFailed] = useState('');
  return <span className={'user-avatar' + (large ? ' user-avatar-large' : '')}>
    {photo && failed !== photo ? <img src={photo} alt={`Foto de ${name}`} onError={() => setFailed(photo)} /> : <span aria-label={`Inicial de ${name}`}>{userInitial(name)}</span>}
  </span>;
}
