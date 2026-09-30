import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const windows = process.platform === 'win32';
const candidates = windows ? [
  ...(process.env.PATH || '').split(delimiter).map(dir => join(dir, 'pwsh.exe')),
  join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
  join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'native', 'powershell', 'pwsh.exe'),
] : [];
const executable = windows ? candidates.find(existsSync) : 'sh';
if (!executable) {
  console.error('Para el desarrollo local en Windows instala PowerShell 7 y agrega pwsh al PATH.');
  process.exit(1);
}
const args = windows
  ? ['-NoProfile', '-File', join(root, 'scripts', 'dev-backend.ps1')]
  : [join(root, 'scripts', 'dev-backend-linux.mjs')];
const child = spawn(windows ? executable : process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
