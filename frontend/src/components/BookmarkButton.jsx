import { useExploration } from '../contexts/ExplorationContext';
export default function BookmarkButton({ id, label = 'opción', item }) {
  const { saved, toggleSaved, persistent, syncState, syncError, retrySync } = useExploration();
  const normalizedId = id.replace(/-aside$/, '');
  const isSaved = saved.some(value => value.id === normalizedId);
  const fallback = { id: normalizedId, name: label, type: id.startsWith('institution-') ? 'institution' : 'opportunity', href: id.startsWith('institution-') ? `/instituciones/${encodeURIComponent(id.slice(12))}` : '/becas' };
  return <><button type="button" className="save-button" disabled={syncState === 'loading'} aria-pressed={isSaved} aria-label={`${isSaved ? 'Quitar de guardados' : 'Guardar'} ${label}`} onClick={() => toggleSaved(item || fallback)}>{isSaved ? 'Guardado' : 'Guardar'}</button>{syncError && <small role="status">Pendiente de sincronizar. <button className="text-link plain-button" type="button" onClick={retrySync}>Reintentar</button></small>}{!persistent && syncState !== 'synced' && <small role="status">Los cambios pendientes permanecen durante esta visita.</small>}</>;
}
