import { useExploration } from '../contexts/ExplorationContext';
export default function BookmarkButton({ id, label = 'opción', item }) {
  const { saved, toggleSaved, persistent } = useExploration();
  const normalizedId = id.replace(/-aside$/, '');
  const isSaved = saved.some(value => value.id === normalizedId);
  const fallback = { id: normalizedId, name: label, type: id.startsWith('institution-') ? 'institution' : 'opportunity', href: id.startsWith('institution-') ? `/instituciones/${encodeURIComponent(id.slice(12))}` : '/becas' };
  return <><button type="button" className="save-button" aria-pressed={isSaved} aria-label={`${isSaved ? 'Quitar de guardados' : 'Guardar'} ${label}`} onClick={() => toggleSaved(item || fallback)}>{isSaved ? 'Guardado' : 'Guardar'}</button>{!persistent && <small role="status">Guardado solo durante esta visita.</small>}</>;
}
