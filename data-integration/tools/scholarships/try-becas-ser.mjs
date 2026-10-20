import { PoliteClient } from '../program-links/network.mjs';
import { collectBecasSer } from '../../src/sources/mineducacion/becas-ser.mjs';

const client = new PoliteClient(['mineducacion.gov.co']);
const r = await collectBecasSer(client);
console.log(JSON.stringify({ ...r, instituciones: r.instituciones?.length, muestra: r.instituciones?.slice(0, 3) }, null, 2));
