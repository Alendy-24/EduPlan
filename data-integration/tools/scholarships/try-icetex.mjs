// data-integration/tools/scholarships/try-icetex.mjs
// Descarga el listado y cada plan (con pausa y robots.txt, vía PoliteClient) y muestra lo que se enviaría al backend.
// No escribe nada en la base de datos.
import { PoliteClient } from '../program-links/network.mjs';
import { collectIcetex } from '../../src/sources/icetex/creditos.mjs';

const client = new PoliteClient(['web.icetex.gov.co']);
const { items, skipped, ...run } = await collectIcetex(client);

console.log(JSON.stringify(run, null, 2));
console.log(`\nPlanes incluidos: ${items.length}`);
for (const item of items) console.log(JSON.stringify(item, null, 2));
console.log(`\nOmitidos: ${skipped.length}`);
for (const entry of skipped) console.log(`  - ${entry.name}: ${entry.reason} (${entry.url})`);
