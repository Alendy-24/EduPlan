import { PoliteClient } from '../program-links/network.mjs';
import { writeFileSync } from 'node:fs';
import { load } from 'cheerio';

const client = new PoliteClient(['mineducacion.gov.co']);
const res = await client.get('https://www.mineducacion.gov.co/portal/micrositios-superior/Becas-SER/Banco-de-Programas-de-Becas/');
writeFileSync('/tmp/banco.html', res.text);

const $ = load(res.text);
console.log({
  status: res.status,
  finalUrl: res.url,
  bytes: res.text.length,
  title: $('title').text().trim(),
  tables: $('table').length,
  hasIesText: res.text.includes('Nombre de la IES'),
  h2: $('h2').map((_, e) => $(e).text().trim().slice(0, 40)).get(),
  bodyStart: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 300),
});
