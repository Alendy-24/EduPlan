import { academicProgramName } from '../utils/programs';
// Names arrive joined with SNIES. No per-program URL requests.
// Older comparison snapshots must not display awarded titles as academic names.
export function useOfficialPrograms(programs) {
  return programs.map(program => ({ ...program, name: program.provenance === 'real' && program.nameOrigin !== 'SNIES_NAME' ? 'Nombre del programa no disponible' : academicProgramName(program) }));
}
