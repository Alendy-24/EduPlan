import { isManagedPostgres, run } from './local-dev.mjs';
const inspected = await run('docker', ['inspect', 'eduplan-postgres']);
if (!inspected.ok || !isManagedPostgres(JSON.parse(inspected.output)[0])) {
  console.error('No existe un contenedor PostgreSQL válido de EduPlan. No se detuvo ninguna base.');
  process.exitCode = 1;
} else {
  const result = await run('docker', ['stop', 'eduplan-postgres'], { timeout: 30000 });
  console.log(result.ok ? 'PostgreSQL detenido; los datos se conservan.' : result.output);
  process.exitCode = result.ok ? 0 : 1;
}
