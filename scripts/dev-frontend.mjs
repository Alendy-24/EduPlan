import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const backendUrl = new URL('/api/me/preferences', process.env.EDUPLAN_BACKEND_URL || 'http://127.0.0.1:8080');
let stopped = false;
let child;

function backendReady() {
  return new Promise(resolve => {
    const probe = request(backendUrl, { timeout: 1000 }, response => {
      response.resume();
      resolve(response.statusCode === 401);
    });
    probe.on('timeout', () => probe.destroy());
    probe.on('error', () => resolve(false));
    probe.end();
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopped = true;
    if (child) child.kill(signal);
  });
}

console.log('Esperando a que el backend termine de iniciar antes de abrir el frontend...');
while (!stopped && !(await backendReady())) {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

if (!stopped) {
  console.log('Backend listo; iniciando Vite.');
  child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
    'run', 'dev', '--prefix', 'frontend', ...(process.argv.length > 2 ? ['--', ...process.argv.slice(2)] : []),
  ], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
