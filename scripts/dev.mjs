import concurrently from 'concurrently';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { preflight, prepareEnvironment, root, stateDir, waitFor } from './local-dev.mjs';
let group;
try {
  const env = await prepareEnvironment(await preflight());
  const log = createWriteStream(join(stateDir, 'dev.log'), { flags: 'w', mode: 0o600 });
  const node = `"${process.execPath}"`;
  group = concurrently([
    { name: 'backend', command: `${node} scripts/dev-backend.mjs --prepared`, cwd: root, env },
    { name: 'data-integration', command: `${node} ../node_modules/tsx/dist/cli.mjs watch src/index.ts`, cwd: join(root, 'data-integration'), env: { ...env, PORT: '3001' } },
    { name: 'frontend', command: `${node} scripts/dev-frontend.mjs`, cwd: root, env },
  ], { killOthersOn: ['failure', 'success'], outputStream: log, prefix: 'name' });
  const completion = group.result.then(() => { throw new Error('Un servicio terminó antes de detener EduPlan.'); }, () => { throw new Error('Un servicio falló. Revisa .tools/local-dev/dev.log.'); });
  const readiness = (async () => {
    await waitFor('http://127.0.0.1:8080/api/me/preferences', 401);
    console.log('✓ Backend');
    await waitFor('http://127.0.0.1:3001/health', 200);
    console.log('✓ Data integration');
    await waitFor('http://localhost:3005/', 200);
    console.log('✓ Frontend\n\nEduPlan listo:\nhttp://localhost:3005\n\nCtrl+C para detener. Logs: .tools/local-dev/dev.log');
  })();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    group.commands.forEach(command => command.kill());
    process.exit(0);
  });
  await Promise.race([readiness, completion]);
  await completion;
} catch (error) {
  group?.commands.forEach(command => command.kill());
  console.error(`\n${error.message}`);
  process.exitCode = 1;
  // Cancel outstanding readiness polls after a service fails.
  if (group) process.exit(1);
}
