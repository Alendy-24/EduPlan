import { offerIsSelected } from '../utils/program-search';
import { useExploration } from '../contexts/ExplorationContext';
export default function CompareButton({ program }) {
  const { comparison, toggleCompare } = useExploration();
  const selected = comparison.some(p => offerIsSelected(p, program));
  const full = !selected && comparison.length >= 3;
  return <button type="button" className="btn btn-secondary" aria-pressed={selected} aria-label={`${selected ? 'Quitar de comparación' : 'Comparar'} ${program.name}`} disabled={full} title={full ? 'Puedes comparar hasta tres programas. Quita uno desde la barra de comparación.' : undefined} onClick={() => toggleCompare(program)}>{selected ? 'En comparación' : full ? 'Comparador lleno' : 'Comparar'}</button>;
}
