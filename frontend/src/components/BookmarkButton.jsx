import { useExploration } from '../contexts/ExplorationContext';
export default function BookmarkButton({ id, label = 'opción', item, iconOnly = false }) {
  const { saved, toggleSaved, persistent, syncState, syncError, retrySync } = useExploration();
  const normalizedId = id.replace(/-aside$/, '');
  const isSaved = saved.some(value => value.id === normalizedId);
  const fallback = { id: normalizedId, name: label, type: id.startsWith('institution-') ? 'institution' : 'opportunity', href: id.startsWith('institution-') ? `/instituciones/${encodeURIComponent(id.slice(12))}` : '/becas' };
  return <><button type="button" className="save-button" disabled={syncState === 'loading'} aria-pressed={isSaved} aria-label={`${isSaved ? 'Quitar de guardados' : 'Guardar'} ${label}`} onClick={() => toggleSaved(item || fallback)}>{iconOnly ? <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg> : isSaved ? 'Guardado' : 'Guardar'}</button>{syncError && <small role="status">Pendiente de sincronizar. <button className="text-link plain-button" type="button" onClick={retrySync}>Reintentar</button></small>}{!persistent && syncState !== 'synced' && <small role="status">Los cambios pendientes permanecen durante esta visita.</small>}</>;
}
