// data-integration/tests/icetex.test.mjs   (correr con: node --test tests/icetex.test.mjs)
// Usa los recortes de tests/fixtures. Cuando guardes el HTML crudo con curl, apunta estas pruebas a esos archivos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCoverage, parseListing, parsePlan } from '../src/sources/icetex/creditos.mjs';

const fixture = name => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const PLAN_URL = 'https://web.icetex.gov.co/es/-/tu-pagas-el-30';

test('listado: 4 tarjetas, sin el bloque de preinscripción', () => {
  const cards = parseListing(fixture('icetex-listado.sample.html'));
  assert.deepEqual(cards.map(card => card.url), [
    'https://web.icetex.gov.co/es/-/tu-pagas-el-30',
    'https://web.icetex.gov.co/es/-/plan-progresivo-mediano-plazo-linea-tu-eliges-el-40',
    'https://web.icetex.gov.co/-/etdh',
    'https://web.icetex.gov.co/creditos/planes-de-financiacion/educacion-continuada',
  ]);
  assert.ok(cards.every(card => card.listedAsUnavailable));
});

test('listado: frase de cobertura', () => {
  assert.equal(parseCoverage(fixture('icetex-listado.sample.html')),
    'Financia hasta el 100% de la matrícula con diferentes alternativas de pago.');
});

test('plan: Plan Flexible 30% (hoy no disponible)', () => {
  const coverage = parseCoverage(fixture('icetex-listado.sample.html'));
  const plan = parsePlan(fixture('icetex-plan-30.sample.html'), PLAN_URL, coverage);
  assert.equal(plan.idExterno, 'icetex-tu-pagas-el-30');
  assert.equal(plan.nombre, 'Plan Flexible · Mediano Plazo Tú Eliges 30%');
  assert.deepEqual(plan.niveles, ['pregrado']);
  assert.deepEqual(plan.tiposApoyo, ['credito']);
  assert.equal(plan.region, 'Colombia');
  assert.equal(plan.aceptaPostulaciones, false);       // el "Convocatoria abierta" está en comentarios HTML
  assert.equal(plan.enlacePostulacion, null);          // el botón existe en el HTML pero el plan no está disponible
  assert.equal(plan.nota, 'Tasa: IPC + 9% que equivale al 1,14% mes vencido (14,56% efectivo anual).');
  assert.match(plan.descripcion, /Mientras estudias: Pagarás el 30% del valor financiado\./);
  assert.match(plan.cobertura, /^Financia hasta el 100%.*70% restante\.$/);
  assert.equal(plan.requisitosLista.length, 7);        // 2 condiciones + 5 planes por área de estudio
  assert.equal(plan.fechaLimite, null);
});

test('plan sin indicador de nivel (p. ej. ETDH) se omite', () => {
  const result = parsePlan('<h1>Plan ETDH</h1>', 'https://web.icetex.gov.co/-/etdh');
  assert.ok(result.skipped);
});
