import { useExploration } from '../contexts/ExplorationContext';
export default function CompareButton({ program }) {
  const { comparison, toggleCompare } = useExploration();
  const selected = comparison.some(p => p.id === program.id);
  const full = !selected && comparison.length >= 3;
  return <button type="button" className="btn btn-secondary" aria-pressed={selected} aria-label={`${selected ? 'Quitar de comparación' : 'Comparar'} ${program.name}`} disabled={full} title={full ? 'Puedes comparar hasta tres programas. Quita uno desde el comparador.' : undefined} onClick={() => toggleCompare(program)}>{selected ? 'En comparación' : full ? 'Comparador lleno' : 'Comparar'}</button>;
}
