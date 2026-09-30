import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const configured = ['DB_URL', 'DB_USER', 'DB_PASSWORD'].filter(key => process.env[key]);
if (configured.length !== 0 && configured.length !== 3) {
  console.error('Configura DB_URL, DB_USER y DB_PASSWORD juntos para usar una base existente.');
  process.exit(1);
}

if (configured.length === 0) {
  const stateDir = join(root, '.tools', 'local-dev');
  const credentialsFile = join(stateDir, 'wsl-database.json');
  mkdirSync(stateDir, { recursive: true });
  if (!existsSync(credentialsFile)) {
    writeFileSync(credentialsFile, JSON.stringify({ password: randomBytes(32).toString('base64url') }), { flag: 'wx', mode: 0o600 });
  }
  const { password } = JSON.parse(readFileSync(credentialsFile, 'utf8'));
  if (typeof password !== 'string' || password.length < 32) {
    console.error('Las credenciales locales de PostgreSQL no son válidas.');
    process.exit(1);
  }
  const started = spawnSync('docker', ['compose', '-f', join(root, 'docker', 'docker-compose.yml'), 'up', '-d', '--wait', 'postgres'], {
    cwd: root,
    env: { ...process.env, POSTGRES_PASSWORD: password },
    stdio: 'inherit',
    timeout: 120000,
  });
  if (started.error || started.status !== 0) {
    console.error('No se pudo iniciar PostgreSQL local con Docker. Comprueba que Docker esté disponible.');
    process.exit(1);
  }
  process.env.DB_URL = 'jdbc:postgresql://127.0.0.1:5433/eduplan_db';
  process.env.DB_USER = 'eduplan';
  process.env.DB_PASSWORD = password;
  console.log('PostgreSQL de desarrollo disponible en 127.0.0.1:5433; backend en 127.0.0.1:8080.');
}

process.env.JWT_SECRET ||= randomBytes(48).toString('base64');
const cachedMaven = join(root, '.tools', 'maven', 'apache-maven-3.9.16', 'bin', 'mvn');
const maven = existsSync(cachedMaven) ? cachedMaven : join(root, 'backend', 'src', 'mvnw');
const child = spawn(maven, ['-B', '-ntp', `-Dmaven.repo.local=${join(root, '.tools', 'm2')}`, 'spring-boot:run'], {
  cwd: join(root, 'backend', 'src'),
  env: process.env,
  stdio: 'inherit',
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
