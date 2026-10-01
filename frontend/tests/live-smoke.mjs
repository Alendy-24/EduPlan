// End-to-end against running services. Creates disposable accounts in the isolated dev DB.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.EDUPLAN_TEST_URL || 'http://localhost:3005';
const out = fileURLToPath(new URL('../../.tools/qa/live/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(45000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
const report = [];
const suffix = randomBytes(6).toString('hex');
const email = `qa-${suffix}@example.test`, otherEmail = `qa-other-${suffix}@example.test`;
const password = randomBytes(16).toString('base64url');
const ok = message => { report.push(message); console.log(`PASS: ${message}`); };
async function post(mode, data, status) {
  const response = await page.request.post(`${base}/api/auth/${mode}`, { data });
  assert.equal(response.status(), status, `${mode} expected ${status}, got ${response.status()}`);
  return response;
}
async function login(account) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Correo electrónico').fill(account);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForURL(url => ['/dashboard', '/perfil'].includes(url.pathname));
  await page.goto(`${base}/dashboard`);
}
async function catalog(route, endpoint) {
  const pending = page.waitForResponse(r => r.url().includes(`/api/${endpoint}?`) && r.status() === 200);
  await page.goto(base + route);
  const response = await pending;
  const body = await response.json();
  await page.waitForFunction(() => !document.querySelector('[role="status"]')?.textContent?.includes('Cargando'));
  return body.data;
}
try {
  await page.goto(`${base}/dashboard`); await page.waitForURL('**/login');
  await page.goto(`${base}/register`);
  await page.getByLabel('Nombre completo').fill('Usuario Prueba Local');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  const registration = page.waitForResponse(r => r.url().endsWith('/api/auth/register'));
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  assert.equal((await registration).status(), 201);
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: 'Hola, Usuario Prueba Local' }).waitFor();
  const session = await page.evaluate(() => {
    const s = JSON.parse(sessionStorage.getItem('eduplan-session-v1'));
    return { user: s.user, expiresAt: s.expiresAt, tokenParts: s.token.split('.').length, hasPassword: 'password' in s };
  });
  assert.equal(session.user.email, email); assert.equal(session.tokenParts, 3); assert(!session.hasPassword); assert(session.expiresAt > Date.now());
  await page.reload(); await page.getByRole('heading', { name: 'Hola, Usuario Prueba Local' }).waitFor();
  ok('Registro real 201, JWT y sesión por pestaña; dashboard conserva nombre tras recarga');
  await post('register', { name: 'Duplicado', email, password }, 409);
  for (const invalid of ['', null, 'short']) await post('register', { name: 'Inválido', email: otherEmail, password: invalid }, 400);
  await post('login', { identifier: email, password: 'incorrecta' }, 401);
  await post('login', { identifier: `missing-${suffix}@example.test`, password }, 401);
  const logged = await (await post('login', { identifier: email, password }, 200)).json();
  assert.equal(logged.name, 'Usuario Prueba Local'); assert.equal(logged.tokenType, 'Bearer'); assert(logged.expiresIn > 0);
  ok('Auth real: duplicado 409, inválidos 400, credenciales incorrectas/inexistentes 401 y login 200');
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await page.goto(`${base}/perfil`); await page.waitForURL('**/login'); await login(email);
  await page.goto(`${base}/comparar`); await page.getByRole('heading', { name: 'Aún no has elegido programas' }).waitFor();
  const programs = await catalog('/programas', 'programs'); assert.equal(programs.length, 12); assert(programs.every(p => p.sourceId));
  await page.locator('.list-item').first().waitFor();
  await page.locator('.list-item').first().getByRole('button', { name: /^Guardar / }).click();
  for (let n = 0; n < 3; n++) await page.locator('.list-item').nth(n).getByRole('button', { name: /^Comparar / }).click();
  assert(await page.locator('.list-item').nth(3).getByRole('button', { name: /^Comparar / }).isDisabled());
  const next = page.waitForResponse(r => r.url().includes('/api/programs?') && new URL(r.url()).searchParams.get('page') === '2');
  await page.getByRole('button', { name: 'Cargar más programas' }).click(); assert.equal((await next).status(), 200);
  await page.waitForFunction(() => document.querySelectorAll('.list-item').length > 12);
  ok('Programas reales: sourceId, paginación y selección máxima de tres; usuario nuevo inicia vacío');
  const program = programs[0], detail = `/programas/${program.code}?registro=${encodeURIComponent(program.sourceId)}`;
  await page.goto(base + detail); await page.locator('.save-button[aria-pressed=true]').first().waitFor();
  assert.equal(await page.locator('.save-button[aria-pressed=true]').count(), 2);
  await page.locator('.save-button').first().click(); assert.equal(await page.locator('.save-button[aria-pressed=true]').count(), 0);
  await page.locator('.save-button').last().click(); assert.equal(await page.locator('.save-button[aria-pressed=true]').count(), 2);
  await page.reload(); await page.locator('.save-button[aria-pressed=true]').first().waitFor();
  await page.getByRole('tab', { name: 'Descripción', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'Plan de estudios', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByText('La información de plan de estudios no está disponible en este catálogo.', { exact: false }).first().waitFor();
  await page.goto(`${base}/programas/${program.code}`); await page.getByRole('heading', { name: 'Selecciona un registro del programa' }).waitFor();
  assert(await page.locator('.record-option').count() > 1);
  await page.goto(`${base}/programas/${program.code}?registro=missing`); await page.getByRole('heading', { name: 'Registro no disponible' }).waitFor();
  await page.goto(`${base}/programas/999999999`); await page.getByRole('alert').waitFor();
  ok('Detalle real: múltiples filas explícitas, selección exacta, fila/código inexistentes, tabs y guardados sincronizados');
  for (const [filter, value] of [['q', 'ADMINISTRACION'], ['city', program.municipality], ['modality', program.modality]]) {
    const data = await catalog(`/programas?${new URLSearchParams({ [filter]: value })}`, 'programs'); assert(data.length > 0);
  }
  await catalog('/programas?q=zzzzqa-no-existe-zzzz', 'programs'); await page.getByRole('heading', { name: 'Sin resultados' }).waitFor();
  await page.route('**/api/programs?**', route => route.abort());
  await page.goto(`${base}/programas`); await page.getByRole('alert').waitFor();
  await page.unroute('**/api/programs?**'); await page.getByRole('button', { name: 'Reintentar' }).click(); await page.locator('.list-item').first().waitFor();
  await page.getByText('Los filtros y el orden se aplican a todo el catálogo. El conteo corresponde a los registros cargados.').waitFor();
  ok('Programas: búsqueda, municipio, modalidad, vacío, fallo de red inducido y reintento contra servicio real');
  const institutionPrograms = await catalog(`/instituciones/${program.institutionCode}/programas`, 'programs');
  assert(institutionPrograms.every(p => p.institutionCode === program.institutionCode));
  ok('Programas de institución real: institutionCode enviado y asociación comprobada');
  const institutions = await catalog('/instituciones', 'institutions'); assert.equal(institutions.length, 12);
  await page.locator('.institution-card').first().waitFor();
  const more = page.waitForResponse(r => r.url().includes('/api/institutions?') && new URL(r.url()).searchParams.get('page') === '2');
  await page.getByRole('button', { name: 'Mostrar más instituciones', exact: true }).click(); assert.equal((await more).status(), 200);
  await page.waitForFunction(() => document.querySelectorAll('.institution-card').length > 12);
  const inst = institutions[0];
  for (const params of [{ q: 'NACIONAL' }, { city: inst.municipality }, { modality: 'Presencial' }, { program: 'ADMINISTRACION' }, { sector: inst.sector }, { academicCharacter: inst.academicCharacter }, { q: 'NACIONAL', sector: inst.sector, modality: 'Presencial' }]) {
    const rows = await catalog(`/instituciones?${new URLSearchParams(params)}`, 'institutions'); assert(rows.length > 0);
  }
  await catalog('/instituciones?q=zzzzqa-no-existe-zzzz', 'institutions'); await page.getByRole('heading', { name: 'No encontramos instituciones con esos criterios.' }).waitFor();
  await page.route('**/api/institutions?**', route => route.abort()); await page.goto(`${base}/instituciones`); await page.getByRole('alert').waitFor();
  await page.unroute('**/api/institutions?**'); await page.getByRole('button', { name: 'Reintentar' }).click(); await page.locator('.institution-card').first().waitFor();
  ok('Instituciones: seis filtros, combinación, paginación, vacío y reintento contra API real');
  await page.goto(`${base}/comparar`); assert.equal(await page.locator('.comparison-selection strong').count(), 3); await page.reload(); assert.equal(await page.locator('.comparison-selection strong').count(), 3);
  await page.getByRole('button', { name: /^Quitar / }).first().click(); assert.equal(await page.locator('.comparison-selection strong').count(), 2);
  await page.getByRole('button', { name: 'Limpiar comparación' }).click(); await page.getByRole('heading', { name: 'Aún no has elegido programas' }).waitFor();
  await catalog('/programas', 'programs'); await page.locator('.list-item').first().waitFor();
  for (let n = 0; n < 3; n++) await page.locator('.list-item').nth(n).getByRole('button', { name: /^Comparar / }).click();
  await page.goto(`${base}/perfil?seccion=intereses`); await page.getByText('Intereses: 0%', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Tecnología', exact: true }).click(); await page.getByText('Intereses: 50%', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Investigar', exact: true }).click(); await page.getByRole('button', { name: 'Guardar intereses' }).click();
  await page.getByText('Intereses guardados en tu cuenta.', { exact: true }).waitFor();
  await page.reload(); await page.getByText('Intereses: 100%', { exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click(); await page.getByText(email, { exact: true }).waitFor();
  ok('Comparación recargada/quitar/limpiar; perfil real, intereses 0/50/100 persistidos');
  const routes = ['/', '/programas', detail, '/comparar', '/dashboard', '/perfil', '/instituciones', '/becas', '/guias'];
  let views = 0;
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(base + route); await page.locator('main').waitFor();
      if (route === '/programas') await page.locator('.list-item').first().waitFor();
      if (route === '/instituciones') await page.locator('.institution-card').first().waitFor();
      if (route === detail) await page.locator('.save-button').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow ${width}`);
      await page.screenshot({ path: `${out}/${route === '/' ? 'landing' : route === detail ? 'detail' : route.slice(1)}-${width}.png`, fullPage: true }); views++;
    }
  }
  await post('register', { name: 'Otra Cuenta Local', email: otherEmail, password }, 201);
  await page.getByRole('button', { name: 'Salir', exact: true }).click(); await login(otherEmail);
  assert.equal(await page.locator('.saved-list li').count(), 0);
  await page.goto(`${base}/perfil`); await page.getByText('Intereses completados: 0 %', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Salir', exact: true }).click(); await login(email);
  await page.locator('.saved-list li').first().waitFor();
  await page.goto(`${base}/perfil`); await page.getByText('Intereses completados: 100 %', { exact: true }).waitFor();
  ok('Dos cuentas reales: guardados e intereses separados y recuperados al volver');
  await page.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('eduplan-session-v1')); s.expiresAt = Date.now() - 1; sessionStorage.setItem('eduplan-session-v1', JSON.stringify(s)); });
  await page.reload(); await page.waitForURL('**/login');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/login', '/register']) {
      await page.goto(base + route); await page.getByLabel('Correo electrónico').waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${out}/${route.slice(1)}-${width}.png`, fullPage: true }); views++;
    }
  }
  ok(`Sesión expirada protegida; ${views} vistas reales en 1440/1024/768/390 sin overflow`);
  assert.deepEqual(errors, []);
  await writeFile(`${out}/report.json`, JSON.stringify({ report, views, accounts: [email, otherEmail], errors }, null, 2));
} finally { await browser.close(); }
