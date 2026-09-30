import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.EDUPLAN_PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
const base = process.env.EDUPLAN_TEST_URL || 'http://127.0.0.1:5173';
try {
  await page.goto(`${base}/becas`);
  await page.getByText('Fuentes oficiales, con fecha de revisión', { exact: true }).waitFor();
  assert.equal(await page.locator('.scholarship-card').count(), 8);
  await page.getByLabel(/^Nivel/).selectOption('Posgrado');
  await page.waitForFunction(() => document.querySelectorAll('.scholarship-card').length === 4);
  assert.equal(await page.locator('.scholarship-card').count(), 4);
  await page.locator('.save-button').first().click(); await page.reload();
  assert.equal(await page.locator('.save-button[aria-pressed=true]').count(), 1);
  await page.getByRole('button', { name: 'Más filtros', exact: true }).click();await page.getByLabel(/^Tipo de oportunidad/).selectOption('Beca');
  await page.getByLabel(/^Lugar de estudio/).selectOption('Colombia'); await page.waitForFunction(() => document.querySelectorAll('.scholarship-card').length === 1); assert.equal(await page.locator('.scholarship-card').count(), 1);
  await page.getByRole('heading', { name: 'Beca Colombia Extranjeros', exact: true }).waitFor();
  await page.goto(`${base}/guias`); assert.equal(await page.locator('.guide-card ol').count(), 3);
  const links = await page.locator('a[href^="/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  assert(!links.includes('/ayuda')); assert(links.includes('/perfil') && links.includes('/comparar') && links.includes('/becas'));
  await page.goto(`${base}/register`);
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click(); assert.equal(await page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click(); assert.equal(await page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'password');
  await page.getByLabel('Nombre completo').focus(); await page.keyboard.press('Tab'); assert.equal(await page.locator(':focus').getAttribute('name'), 'email');
  assert(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle !== 'none'));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(base); await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Instituciones', exact: true }).click();
  await page.locator('.institution-card').first().waitFor();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const controls = await page.locator('main button:visible, main input:visible, main select:visible').evaluateAll(nodes => nodes.filter(n => !n.disabled).map(n => ({ label: n.getAttribute('aria-label') || n.textContent || n.name, height: n.getBoundingClientRect().height })));
    assert(controls.every(c => c.height >= 44), JSON.stringify(controls.filter(c => c.height < 44)));
  }
  const contrast = await page.evaluate(() => {
    const lum = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    return ['.institution-card-badge', '.institution-card-location', '.photo-credit'].map(selector => {
      const el = document.querySelector(selector); let parent = el;
      while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
      const a = lum(getComputedStyle(el).color), b = lum(parent ? getComputedStyle(parent).backgroundColor : 'rgb(255,255,255)');
      return { selector, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
  });
  assert(contrast.every(c => c.ratio >= 4.5), JSON.stringify(contrast));
  console.log('PASS: becas, elegibilidad universal, guardado recargado, guías, mostrar contraseña, teclado/foco, menú móvil, controles 44px y contraste de textos secundarios');
} finally { await browser.close(); }
