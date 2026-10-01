import { profileCompleteness, levels, modalities } from '../../utils/preferences';
import { validLocation } from '../../utils/profile-location';
import ProfileIcon from './ProfileIcon';
export default function ProfileCompletion({ preferences, interests, dirty }) {
  const percent = profileCompleteness(preferences, interests);
  const checks = [
    ['Meta académica', levels.includes(preferences.academicLevel)],
    ['Ubicación', validLocation(preferences)],
    ['Modalidad', modalities.includes(preferences.modality)],
    ['Intereses y afinidades', interests.areas.length > 0 && interests.motivations.length > 0],
  ];
  return <section className="profile-completion" aria-labelledby="completion-title">
    <div className="completion-heading"><div className="completion-ring" style={{ '--completion': `${percent}%` }} role="progressbar" aria-label="Completitud del perfil académico" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><strong>{percent}%</strong></div><div><h2 id="completion-title">Tu perfil, paso a paso</h2><p>{percent === 100 ? 'Ya completaste la información de tu perfil.' : 'Cada respuesta ayuda a encontrar opciones más afines a ti.'}</p></div></div>
    <ul>{checks.map(([label, done]) => <li key={label} className={done ? 'is-complete' : ''}><span aria-hidden="true">{done ? <ProfileIcon name="check"/> : '○'}</span>{label}<span className="sr-only">{done ? ': completado' : ': pendiente'}</span></li>)}</ul>
    <p className="completion-note">{dirty ? 'Guarda tus cambios para actualizar las recomendaciones.' : 'El progreso cuenta tus respuestas; no mide tu compatibilidad con un programa.'}</p>
  </section>;
}
