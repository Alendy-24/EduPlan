import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolveInstitutionPhone, formatColombianPhone } from '../src/utils/institution-phone.js';

// Audita formato y procedencia de TODAS las filas, sin afirmar que las líneas están activas.
// --snapshot permite reproducir una revisión sin volver a contactar a Sócrata.
const snapshotIndex = process.argv.indexOf('--snapshot');
const source = 'https://www.datos.gov.co/resource/n5yy-8nav.json?$limit=50000';
let rows;
if (snapshotIndex !== -1) {
  const path = process.argv[snapshotIndex + 1];
  if (!path) throw new Error('Falta la ruta de --snapshot');
  rows = JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
} else {
  const response = await fetch(source, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`No se pudo consultar MEN: HTTP ${response.status}`);
  rows = await response.json();
}
if (!Array.isArray(rows) || rows.length >= 50000) throw new Error('Catálogo incompleto o no válido');

const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const lines = [['codigo', 'institucion', 'municipio', 'departamento', 'telefono_men', 'estado_formato_men', 'telefono_mostrado', 'estado_mostrado', 'contrastado_sitio_oficial', 'fuente', 'fecha_revision'].map(csv).join(',')];
const sourceCounts = {}, displayCounts = {};
let reviewed = 0;
for (const row of rows) {
  if (!/^\d+$/.test(row.c_digo_instituci_n ?? '')) throw new Error('Código MEN no válido en el catálogo');
  const institution = { code: row.c_digo_instituci_n, name: row.nombre_instituci_n, municipality: row.municipio_domicilio, department: row.departamento_domicilio, phone: row.tel_fono_domicilio };
  const original = formatColombianPhone(institution.phone, institution.department);
  const contact = resolveInstitutionPhone(institution);
  sourceCounts[original.status] = (sourceCounts[original.status] || 0) + 1;
  displayCounts[contact.status] = (displayCounts[contact.status] || 0) + 1;
  if (contact.verified) reviewed += 1;
  lines.push([institution.code, institution.name, institution.municipality, institution.department, contact.raw, original.status, contact.label, contact.status, contact.verified ? 'si' : 'no', contact.sourceUrl, contact.reviewedAt].map(csv).join(','));
}
const output = fileURLToPath(new URL('../../docs/institution-phone-audit.csv', import.meta.url));
await mkdir(fileURLToPath(new URL('../../docs/', import.meta.url)), { recursive: true });
await writeFile(output, lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ rows: rows.length, sourceCounts, displayCounts, reviewed, output }, null, 2));
