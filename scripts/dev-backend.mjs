import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { preflight, prepareEnvironment, root, windows } from './local-dev.mjs';
try {
  const env = process.argv.includes('--prepared') ? process.env : await prepareEnvironment(await preflight());
  // Maven Wrapper's .cmd requires cmd.exe on Windows; no PowerShell 7 dependency.
  const args = ['-B', '-ntp', 'spring-boot:run'];
  if (env.EDUPLAN_DEBUG === '1') args.push('-Dspring-boot.run.jvmArguments=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=127.0.0.1:5005');
  const child = spawn(windows ? 'cmd.exe' : 'sh', windows
    ? ['/d', '/s', '/c', 'mvnw.cmd ' + args.join(' ')]
    : ['mvnw', ...args], {
    cwd: join(root, 'backend', 'src'), env, stdio: 'inherit', windowsHide: true,
  });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
