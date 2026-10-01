import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { dockerProblem, externalDatabase, isManagedPostgres, nodeCompatible, portFree, preflight } from '../local-dev.mjs';

const container = () => ({ Config: { Image: 'postgres:17-alpine', Labels: { 'com.docker.compose.project': 'eduplan', 'com.docker.compose.service': 'postgres' } }, HostConfig: { PortBindings: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '5433' }] } }, Mounts: [{ Name: 'eduplan_eduplan_postgres_data' }], State: { Running: true } });
function environment({ env = {}, busy = [], dockerFailure, existing } = {}) {
  const calls = [];
  return {
    calls, env,
    available: async port => !busy.includes(port),
    execute: async (command, args) => {
      calls.push([command, ...args]);
      if (command === 'java') return { ok: true, output: 'openjdk version "21.0.12"' };
      if (command === 'javac') return { ok: true, output: 'javac 21.0.12' };
      assert.equal(command, 'docker');
      if (args[0] === 'inspect') return { ok: !!existing, output: existing ? JSON.stringify([existing]) : '' };
      return dockerFailure ?? { ok: true, output: 'Docker Compose version v2.39.0' };
    },
  };
}

test('Node minimum matches Vite engines, including the excluded Node 21 branch', () => {
  for (const v of ['20.19.0','22.12.0','24.18.0']) assert.equal(nodeCompatible(v), true);
  for (const v of ['18.20.0','20.18.9','21.9.0','22.11.0']) assert.equal(nodeCompatible(v), false);
});
test('external database is opt-in and all three values must be usable', () => {
  assert.equal(externalDatabase({}), false);
  const env = { DB_URL: 'jdbc:postgresql://localhost:6543/example', DB_USER: 'dev', DB_PASSWORD: 'random-value' };
  assert.equal(externalDatabase(env), true);
  for (const invalid of [{ DB_USER:'dev' }, { ...env, DB_PASSWORD:' ' }, { ...env, DB_URL:'http://localhost:6543/example' }, { ...env, DB_URL:'jdbc:postgresql://localhost/' }]) assert.throws(() => externalDatabase(invalid));
});
test('Docker diagnoses missing installation, daemon and denied socket without executing fixes', () => {
  assert.match(dockerProblem({ error:{code:'ENOENT'} }), /no instalado/);
  assert.match(dockerProblem({ output:'Cannot connect to the Docker daemon' }), /Inicia Docker/);
  const message = dockerProblem({ output:'permission denied while trying to connect to /var/run/docker.sock' }, 'linux');
  assert.match(message, /sudo usermod -aG docker \$USER/);
  assert.match(message, /wsl --shutdown/);
});
test('preflight with external DB skips Docker and ignores occupied local DB port', async () => {
  const fake = environment({ env: { DB_URL:'jdbc:postgresql://localhost:6543/db',DB_USER:'dev',DB_PASSWORD:'random-value' }, busy:[5433] });
  assert.deepEqual(await preflight(fake), { external:true });
  assert.equal(fake.calls.some(([cmd]) => cmd === 'docker'), false);
});
test('preflight rejects public-port conflicts before starting any services', async () => {
  const fake = environment({busy:[3005]});
  await assert.rejects(preflight(fake), /El puerto 3005 ya está ocupado/);
  assert.equal(fake.calls.some(call => call.includes('up')), false);
});
test('only a running valid EduPlan PostgreSQL container may occupy 5433', async () => {
  await preflight(environment({busy:[5433],existing:container()}));
  const stopped=container();stopped.State.Running=false;
  await assert.rejects(preflight(environment({busy:[5433],existing:stopped})), /5433 ya está ocupado/);
  const alien=container();alien.Config.Labels['com.docker.compose.project']='other';
  assert.equal(isManagedPostgres(alien), false);
  await assert.rejects(preflight(environment({busy:[5433],existing:alien})), /no corresponde/);
});
test('preflight reports Docker socket denial before services launch', async () => {
  await assert.rejects(preflight(environment({dockerFailure:{ok:false,output:'permission denied on /var/run/docker.sock'}})), /no tiene acceso/);
});
test('real port check detects a listening socket and accepts it after release', async () => {
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  try { assert.equal(await portFree(port), false); }
  finally { await new Promise(resolve=>server.close(resolve)); }
  assert.equal(await portFree(port), true);
});

test('fresh local setup generates persistent random DB credentials and an in-memory JWT', async () => {
  const { mkdtempSync, readFileSync, rmSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { prepareEnvironment } = await import('../local-dev.mjs');
  const dir=mkdtempSync(join(tmpdir(),'eduplan-dx-test-'));
  const calls=[];
  const execute=async (cmd,args,opts)=>{
    calls.push({cmd,args,opts});
    return {ok:args[0]!=='volume',output:''};
  };
  try {
    const first=await prepareEnvironment({external:false},{execute,dir,baseEnv:{}});
    const credentials=JSON.parse(readFileSync(join(dir,'docker-database.json'),'utf8'));
    assert.equal(first.DB_PASSWORD,credentials.password);
    assert.equal(Buffer.from(first.JWT_SECRET,'base64').length,48);
    assert.match(first.DB_PASSWORD,/^[A-Za-z0-9_-]{43}$/);
    assert.match(readFileSync(join(dir,'postgres.env'),'utf8'),/POSTGRES_PORT=5433/);
    const second=await prepareEnvironment({external:false},{execute,dir,baseEnv:{}});
    assert.equal(second.DB_PASSWORD,first.DB_PASSWORD);
    assert.notEqual(second.JWT_SECRET,first.JWT_SECRET);
    const auth=calls.find(call=>call.args[0]==='exec');
    assert.equal(auth.args[auth.args.indexOf('-h')+1],'eduplan-postgres');
    assert.equal(auth.args.some(arg=>arg.includes(first.DB_PASSWORD)),false);
    assert.equal(existsSync(join(dir,'jwt.json')),false);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('local setup preserves existing volume when its credentials are missing', async () => {
  const { mkdtempSync, rmSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { prepareEnvironment } = await import('../local-dev.mjs');
  const dir=mkdtempSync(join(tmpdir(),'eduplan-dx-test-'));const calls=[];
  try {
    await assert.rejects(prepareEnvironment({external:false},{dir,baseEnv:{},execute:async (cmd,args)=>{calls.push(args);return {ok:true,output:''};}}),/faltan sus credenciales/);
    assert.equal(calls.length,1);
    assert.equal(existsSync(join(dir,'docker-database.json')),false);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('debug port conflicts are checked only when debugging is enabled', async () => {
  await preflight(environment({busy:[5005]}));
  await assert.rejects(preflight(environment({env:{EDUPLAN_DEBUG:'1'},busy:[5005]})),/5005 ya está ocupado/);
});
