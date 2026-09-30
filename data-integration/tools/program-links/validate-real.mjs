import { readJson, saveJson } from './collect.mjs';
import { PoliteClient } from './network.mjs';
import { extractPage, matchPage } from './extract.mjs';

// Read-only network validation; writes evidence to the ignored report directory, never to PostgreSQL.
const out=process.argv[2] || '.tools/program-links/first-discovery';
const snapshot=await readJson(out+'/catalog.json',null);
if(!snapshot)throw new Error('Falta catalog.json del recorrido inicial');
const probes=[
  {domain:'uniandes.edu.co',code:'1813',url:'https://www.uniandes.edu.co/es/programas/administracion-de-empresas'},
  {domain:'javeriana.edu.co',code:'1708',url:'https://www.javeriana.edu.co/carrera-ingenieria-de-sistemas'},
  {domain:'javeriana.edu.co',code:'1708',url:'https://ingenieria.javeriana.edu.co/web/ingenieria/oferta-pregradosfing'},
  {domain:'unal.edu.co',code:'1101',url:'https://ingenieria.bogota.unal.edu.co/es/formacion/pregrado/ingenieria-mecanica'},
  {domain:'unal.edu.co',code:'1101',url:'https://pregrado.unal.edu.co/presentacion_programas_pre'},
];
const results=[];
for(const probe of probes) {
  try {
    const client=new PoliteClient([probe.domain]);const response=await client.get(probe.url);
    const page=extractPage(response.text,response.url);
    const programs=snapshot.institutions.find(item=>item.code===probe.code)?.programs || [];
    results.push({...probe,status:response.status,dynamic:page.dynamic,title:page.title,headings:page.headings.slice(0,6),snies:page.snies,candidates:matchPage(page,programs),checkedAt:new Date().toISOString()});
  } catch(error) { results.push({...probe,error:error.message}); }
}
await saveJson(out+'/real-validation.json',results);
console.log(JSON.stringify(results.map(({candidates,...result})=>({...result,candidates:candidates?.length || 0})),null,2));
