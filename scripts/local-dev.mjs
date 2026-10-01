import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const stateDir = join(root, '.tools', 'local-dev');
export const windows = process.platform === 'win32';
export const java = (name, env = process.env) => env.JAVA_HOME
  ? join(env.JAVA_HOME, 'bin', name + (windows ? '.exe' : '')) : name;

export function run(command, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, ...options });
    let output = '';
    child.stdout?.on('data', chunk => { output += chunk; });
    child.stderr?.on('data', chunk => { output += chunk; });
    const timer = setTimeout(() => child.kill(), options.timeout ?? 15000);
    child.on('error', error => { clearTimeout(timer); resolve({ ok: false, output, error }); });
    child.on('close', code => { clearTimeout(timer); resolve({ ok: code === 0, output }); });
  });
}

export function externalDatabase(env = process.env) {
  const keys = ['DB_URL', 'DB_USER', 'DB_PASSWORD'];
  const count = keys.filter(key => env[key] !== undefined).length;
  if (!count) return false;
  if (count !== 3 || keys.some(key => !env[key]?.trim())) {
    throw new Error('Configura DB_URL, DB_USER y DB_PASSWORD juntos y sin valores vacíos para usar una base externa.');
  }
  let url;
  try { url = new URL(env.DB_URL.replace(/^jdbc:/, '')); } catch { /* report below */ }
  if (!env.DB_URL.startsWith('jdbc:postgresql://') || !url?.hostname || url.pathname === '/') {
    throw new Error('DB_URL debe ser jdbc:postgresql://host:puerto/base.');
  }
  return true;
}

export function nodeCompatible(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return major === 20 && minor >= 19 || major === 22 && minor >= 12 || major > 22;
}

export function dockerProblem(result, platform = process.platform) {
  if (result.error?.code === 'ENOENT') return 'Docker no instalado. Instala Docker Desktop o Docker Engine con Compose.';
  if (/permission denied|access denied|access is denied/i.test(result.output)) {
    return 'Docker está instalado pero tu usuario no tiene acceso al daemon.' + (platform === 'win32'
      ? '\nComprueba el acceso a Docker Desktop con tu administrador.'
      : '\nEn Linux/WSL normalmente se corrige agregando tu usuario al grupo docker:\nsudo usermod -aG docker $USER\nDespués cierra la sesión. En WSL desde PowerShell: wsl --shutdown\nVuelve a abrir WSL. EduPlan no ejecuta estos comandos.');
  }
  return 'Docker no responde. Inicia Docker Desktop o el daemon de Docker Engine y vuelve a ejecutar npm run doctor.';
}

// Check both loopback families: localhost can resolve to either on the developer's OS.
export async function portFree(port) {
  for (const host of ['127.0.0.1', '::1']) {
    const free = await new Promise(resolve => {
      const server = createServer();
      server.once('error', error => resolve(['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)));
      server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
    });
    if (!free) return false;
  }
  return true;
}

export function isManagedPostgres(container) {
  const labels = container?.Config?.Labels ?? {};
  const ports = container?.HostConfig?.PortBindings?.['5432/tcp'] ?? [];
  return labels['com.docker.compose.project'] === 'eduplan'
    && labels['com.docker.compose.service'] === 'postgres'
    && container.Config.Image === 'postgres:17-alpine'
    && ports.length === 1 && ports[0].HostIp === '127.0.0.1' && ports[0].HostPort === '5433'
    && container.Mounts?.some(mount => mount.Name === 'eduplan_eduplan_postgres_data');
}

export async function preflight({ execute = run, available = portFree, env = process.env } = {}) {
  const errors = [];
  console.log('EduPlan - entorno de desarrollo\n');
  function check(ok, label, detail) {
    console.log(`${ok ? '✓' : '✗'} ${label}`);
    if (!ok) errors.push(detail);
  }
  check(nodeCompatible(), 'Node', 'EduPlan requiere Node.js 20.19+ (20.x) o 22.12+. Se recomienda Node 24.');
  const runtime = await execute(java('java', env), ['-version']);
  const compiler = await execute(java('javac', env), ['-version']);
  const major = Number(runtime.output.match(/version\s+"(\d+)/)?.[1]);
  const compilerMajor = Number(compiler.output.match(/javac\s+(\d+)/)?.[1]);
  check(runtime.ok && compiler.ok && major >= 21 && compilerMajor >= 21, 'Java 21+',
    'Java no disponible o incompatible. EduPlan necesita JDK 21 o superior. Configura JAVA_HOME o el PATH (java y javac).');
  let external = false;
  try { external = externalDatabase(env); } catch (error) { errors.push(error.message); }
  if (env.JWT_SECRET && (!/^[A-Za-z0-9+/]+={0,2}$/.test(env.JWT_SECRET)
    || Buffer.from(env.JWT_SECRET, 'base64').length < 32)) {
    errors.push('JWT_SECRET debe ser Base64 de al menos 32 bytes aleatorios. Omítelo para generar una clave de desarrollo.');
  }
  let managed = false;
  if (!external) {
    const version = await execute('docker', ['--version']);
    const info = version.ok ? await execute('docker', ['info']) : version;
    const compose = info.ok ? await execute('docker', ['compose', 'version']) : info;
    check(compose.ok, 'Docker', !info.ok ? dockerProblem(info)
      : 'Docker Compose no disponible. Instala el plugin Compose v2.');
    if (compose.ok) {
      const inspected = await execute('docker', ['inspect', 'eduplan-postgres']);
      if (inspected.ok) {
        const container = JSON.parse(inspected.output)[0];
        const valid = isManagedPostgres(container);
        managed = valid && container.State?.Running === true;
        if (!valid) errors.push('Existe eduplan-postgres pero no corresponde a la base administrada de EduPlan. No se modificará.');
      }
    }
  } else console.log('✓ Base externa configurada (Docker no requerido)');
  for (const port of [3005, 3001, 8080, ...(!external ? [5433] : []), ...(env.EDUPLAN_DEBUG === '1' ? [5005] : [])]) {
    if (!await available(port) && !(port === 5433 && managed)) {
      errors.push(`El puerto ${port} ya está ocupado. Cierra la instancia anterior de EduPlan antes de iniciar otra.`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n\n'));
  console.log('✓ Puertos');
  return { external };
}

export async function prepareEnvironment({ external }, { execute = run, dir = stateDir, baseEnv = process.env } = {}) {
  const credentialsFile = join(dir, 'docker-database.json');
  mkdirSync(dir, { recursive: true });
  const env = { ...baseEnv, SERVER_PORT: '8080', SERVER_ADDRESS: '127.0.0.1' };
  env.JWT_SECRET ||= randomBytes(48).toString('base64');
  if (!external) {
    if (!existsSync(credentialsFile)) {
      const previous = join(dir, 'wsl-database.json');
      const volume = await execute('docker', ['volume', 'inspect', 'eduplan_eduplan_postgres_data']);
      if (volume.ok && !existsSync(previous)) {
        throw new Error('Existe el volumen PostgreSQL pero faltan sus credenciales. Recupera docker-database.json; no se borraron ni reinicializaron datos.');
      }
      const credentials = existsSync(previous) ? JSON.parse(readFileSync(previous, 'utf8'))
        : { password: randomBytes(32).toString('base64url') };
      writeFileSync(credentialsFile, JSON.stringify(credentials), { flag: 'wx', mode: 0o600 });
    }
    const { password } = JSON.parse(readFileSync(credentialsFile, 'utf8'));
    if (typeof password !== 'string' || !/^[A-Za-z0-9+/_=-]{32,}$/.test(password)) {
      throw new Error('Credenciales PostgreSQL locales inválidas. Recupera el archivo; no se modificó la base.');
    }
    writeFileSync(join(dir, 'postgres.env'), `POSTGRES_DB=eduplan_db\nPOSTGRES_USER=eduplan\nPOSTGRES_PORT=5433\nPOSTGRES_PASSWORD=${password}\n`, { mode: 0o600 });
    const dockerEnv = { ...env, POSTGRES_DB: 'eduplan_db', POSTGRES_USER: 'eduplan', POSTGRES_PORT: '5433', POSTGRES_PASSWORD: password };
    const started = await execute('docker', ['compose', '--env-file', join(dir, 'postgres.env'), '-f', join(root, 'docker', 'docker-compose.yml'), 'up', '-d', '--wait', '--wait-timeout', '90', 'postgres'], { env: dockerEnv, timeout: 120000 });
    if (!started.ok) throw new Error(`No se pudo iniciar PostgreSQL.\n${started.output || dockerProblem(started)}`);
    // pg_isready alone does not check the persisted volume's password.
    const authenticated = await execute('docker', ['exec', '-e', 'PGPASSWORD', 'eduplan-postgres', 'psql', '-h', 'eduplan-postgres', '-U', 'eduplan', '-d', 'eduplan_db', '-Atc', 'SELECT 1'], { env: { ...dockerEnv, PGPASSWORD: password } });
    if (!authenticated.ok) throw new Error('PostgreSQL inició pero las credenciales no corresponden al volumen existente. Recupera sus credenciales; no se borraron datos.');
    Object.assign(env, { DB_URL: 'jdbc:postgresql://127.0.0.1:5433/eduplan_db', DB_USER: 'eduplan', DB_PASSWORD: password });
    console.log('✓ PostgreSQL');
  }
  return env;
}

export async function waitFor(url, status, timeout = 240000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      await response.body?.cancel();
      if (response.status === status) return;
    } catch { /* service is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Un servicio no terminó de iniciar. Revisa .tools/local-dev/dev.log.');
}
