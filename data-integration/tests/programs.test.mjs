import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { get as httpGet } from "node:http";
import { app } from "../dist/app.js";
import { transformProgram, getPrograms, getProgramsByCode, getProgramFilterOptions } from "../dist/services/programs.service.js";
import { getInstitutions, clearInstitutionCatalogCache } from "../dist/services/institutions.service.js";
import { clearProgramCatalogCache, selectPrograms, getProgramCatalog } from '../dist/services/program-catalog.js';
beforeEach(() => { clearInstitutionCatalogCache(); clearProgramCatalogCache(); });

const row = {
  source_row_id: "row-gwwh_nn2q.c23h", codigoprograma: "5", codigoinstitucion: "2209",
  nombreprograma: "Antioquia", nombredepartprograma: "Antioquia",
  nombremunicipioprograma: "Abejorral", nombremetodologia: "Presencial",
  nombretituloobtenido: "LICENCIADO EN EDUCACION FISICA RECREACION Y DEPORTE",
  nombrenbc: "Educación"
};

test("different source rows survive the formerly colliding composite key", () => {
  const a = transformProgram(row);
  const b = transformProgram({...row, source_row_id: "row-umpa~z73n.4mid",
    nombretituloobtenido: "TECNOLOGO AGROPECUARIO"});
  assert.notEqual(a.sourceId, b.sourceId);
  assert.equal(a.code, b.code);
  assert.equal(a.institutionCode, b.institutionCode);
  assert.equal(a.municipality, b.municipality);
  assert.equal(a.modality, b.modality);
});

test("suspicious names retain raw data and keep awarded title separate", () => {
  const program = transformProgram(row);
  assert.equal(program.rawName, "Antioquia");
  assert.equal(program.name, 'Nombre del programa no disponible');
  assert.equal(program.awardedTitle, row.nombretituloobtenido);
  assert.equal(program.nameOrigin, "UNAVAILABLE");
  assert.equal(program.reviewRequired, true);
});

test("missing title does not invent a program name", () => {
  const program = transformProgram({...row, nombretituloobtenido: "NA"});
  assert.equal(program.nameOrigin, "UNAVAILABLE");
  assert.equal(program.reviewRequired, true);
});

test("plausible raw names without a SNIES match are not certified by a heuristic", () => {
  const program = transformProgram({...row, nombreprograma: "INGENIERIA DE SISTEMAS"});
  assert.equal(program.rawName, "INGENIERIA DE SISTEMAS");
  assert.equal(program.name, 'Nombre del programa no disponible');
  assert.equal(program.nameOrigin, "UNAVAILABLE");
  assert.equal(program.reviewRequired, true);
});

test("absence of row identity fails explicitly", () => {
  assert.throws(() => transformProgram({...row, source_row_id: undefined}), /identificador/);
});

test("program detail accepts opaque codes and preserves all source rows", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url.searchParams.get("$where"), "codigoprograma = 'No especifica'");
    return Response.json([{ ...row, codigoprograma: 'No especifica' }, { ...row, source_row_id: 'other-row', codigoprograma: 'No especifica' }]);
  });
  assert.equal((await getProgramsByCode('No especifica')).length, 2);
  const server = app.listen(0); t.after(() => server.close());
  const response = await new Promise((resolve, reject) => {
    httpGet(`http://127.0.0.1:${server.address().port}/api/programs/No%20especifica`, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      res.on('error', reject);
    }).on('error', reject);
  });
  assert.equal(response.status, 200); assert.equal(response.body.data.length, 2);
  assert.equal(response.body.data[0].code, 'No especifica');
});

test("opaque program codes keep SoQL literal escaping", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url.searchParams.get('$where'), "codigoprograma = 'ABC''12'");
    return Response.json([]);
  });
  assert.deepEqual(await getProgramsByCode("ABC'12"), []);
});

test("program queries include row identity, title and unique order", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url.searchParams.get("$order"), ":id");
    assert.match(url.searchParams.get("$select"), /:id as source_row_id/);
    assert.match(url.searchParams.get("$select"), /nombretituloobtenido/);
    assert.equal(url.searchParams.get("$offset"), "100");
    return new Response(JSON.stringify([row]));
  });
  assert.equal((await getPrograms({page: 2, limit: 100}))[0].sourceId, "upr9-nkiz:" + row.source_row_id);
});

test('official academic names participate in search before pagination with all filters', () => {
  const base = { ...transformProgram(row), nameOrigin: 'SNIES_NAME', name: 'Medicina', awardedTitle: 'MÉDICO', academicLevel: 'Pregrado', knowledgeArea: 'Salud', institutionCode: '1701', municipality: 'Bogotá', modality: 'Presencial' };
  const programs = Array.from({length: 20}, (_, i) => ({...base, sourceId: 'upr9-nkiz:' + String(i).padStart(3,'0')}));
  programs.push({...base, sourceId: 'other-institution', institutionCode: '1702'}, {...base, sourceId: 'other-level', academicLevel: 'Posgrado'});
  const result = selectPrograms(programs, {name:'medicina', municipality:'bogota', institutionCode:'1701', modality:'Presencial', academicLevel:'Pregrado', knowledgeArea:'Salud', page:2, limit:12});
  assert.equal(result.length,8); assert(result.every(p => p.searchMatch === 'EXACT_NAME_OR_TITLE' && p.name === 'Medicina'));
  assert.equal(result[0].sourceId, 'upr9-nkiz:012');
  assert.equal(selectPrograms(programs, {name:'médico', page:1,limit:12}).length,12);
});
test('search retains title variants as search matches without converting display names', () => {
  const base = {...transformProgram(row), awardedTitle:'INGENIERO(A) DE SISTEMAS'};
  const result = selectPrograms([base], {name:'ingenieria de sistemas', page:1,limit:12});
  assert.equal(result.length,1); assert.equal(result[0].name, 'Nombre del programa no disponible');
  assert.equal(result[0].searchMatch, 'SIMILAR_NAME_OR_TITLE');
});
test('global alphabetical ordering uses joined academic names before pagination', () => {
  const programs = ['Zootecnia','Medicina','Arquitectura'].map((name,i) => ({...transformProgram(row),name,nameOrigin:'SNIES_NAME',sourceId:'upr9-nkiz:' + i}));
  assert.equal(selectPrograms(programs,{order:'asc',page:2,limit:1})[0].name,'Medicina');
  assert.equal(selectPrograms(programs,{order:'desc',page:1,limit:1})[0].name,'Zootecnia');
});
test('complete source catalog shares concurrent requests, caches successes and does not interpolate user searches', async t => {
  let requests=0;
  t.mock.method(globalThis,'fetch',async url => {
    requests++; assert.equal(url.searchParams.get('$limit'),'10000'); assert.equal(url.searchParams.get('$offset'),'0');
    assert.equal(url.searchParams.get('$where'),null); assert.equal(url.searchParams.get('$order'),':id');
    return Response.json([row]);
  });
  const [a,b] = await Promise.all([getProgramCatalog(':id as source_row_id',transformProgram), getProgramCatalog(':id as source_row_id',transformProgram)]);
  assert.equal(a,b); assert.equal(requests,1); assert.equal(await getProgramCatalog('',transformProgram),a);
  assert.deepEqual(selectPrograms(a,{name:"d'angelo",page:1,limit:12}),[]);
});

test("official filter options group the complete source, reject invalid codes, and cache successful requests", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async url => {
    requests.push(url);
    assert.equal(url.searchParams.get("$limit"), "50000");
    if (url.searchParams.get("$group") === "codigoinstitucion,nombreinstitucion") return Response.json([
      { code: "1101", name: "Universidad oficial" }, { code: "1101", name: "Universidad oficial" },
      { code: "No especifica", name: "No seleccionable" }, { code: "1234", name: "" },
    ]);
    return Response.json([{ value: "Pregrado" }, { value: "Pregrado" }, { value: "" }, { value: "NA" }]);
  });
  const options = await getProgramFilterOptions();
  assert.deepEqual(options.academicLevels, ["Pregrado"]);
  assert.deepEqual(options.institutions, [{ code: "1101", name: "Universidad oficial" }]);
  assert.equal(requests.length, 5);
  assert.equal(await getProgramFilterOptions(), options);
  assert.equal(requests.length, 5);
  const server = app.listen(0); t.after(() => server.close());
  const response = await new Promise((resolve, reject) => {
    httpGet(`http://127.0.0.1:${server.address().port}/api/programs/filters`, res => {
      let body = ""; res.setEncoding("utf8"); res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) })); res.on("error", reject);
    }).on("error", reject);
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, options);
});

test("institution pagination includes a unique tie breaker", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url.searchParams.get("$order"), "c_digo_instituci_n,:id");
    return new Response("[]");
  });
  assert.deepEqual(await getInstitutions({page: 1, limit: 100}), []);
});

test("institution filters combine official program and institution data", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async url => {
    requests.push(url);
    if (url.pathname.includes("upr9-nkiz") && url.searchParams.get("$group") === "codigoinstitucion") {
      return new Response(JSON.stringify([{codigoinstitucion: "1101"}]));
    }
    if (url.pathname.includes("upr9-nkiz")) {
      return new Response(JSON.stringify([{
        codigoinstitucion: "1101", nombremetodologia: "Presencial",
      }]));
    }
    return new Response(JSON.stringify([{
      c_digo_instituci_n: "1101", nombre_instituci_n: "UNIVERSIDAD NACIONAL DE COLOMBIA",
      municipio_domicilio: "Bogotá, D.C.", sector: "Oficial",
    }]));
  });

  const institutions = await getInstitutions({
    name: "nacional", municipality: "bogota", program: "sistemas",
    modality: "Presencial", sector: "Oficial", academicCharacter: "Universidad",
    includeModalities: true, page: 2, limit: 12,
  });
  assert.equal(requests.length, 3);
  assert.match(requests[0].searchParams.get("$where"), /nombreprograma/);
  assert.match(requests[0].searchParams.get("$where"), /nombreestadoprograma = 'Activo'/);
  assert.match(requests[0].searchParams.get("$where"), /nombremetodologia\) = 'PRESENCIAL'/);
  assert.match(requests[1].searchParams.get("$where"), /c_digo_instituci_n in\('1101'\)/);
  assert.match(requests[1].searchParams.get("$where"), /municipio_domicilio/);
  assert.match(requests[1].searchParams.get("$where"), /upper\(sector\) = 'OFICIAL'/);
  assert.match(requests[1].searchParams.get("$where"), /upper\(car_cter_acad_mico\) = 'UNIVERSIDAD'/);
  assert.equal(requests[1].searchParams.get("$offset"), "12");
  assert.match(requests[2].searchParams.get("$where"), /nombreestadoprograma = 'Activo'/);
  assert.deepEqual(institutions[0].modalities, ["Presencial"]);
});

test("institution search returns no results when no programs meet the filters", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests += 1;
    return new Response("[]");
  });
  assert.deepEqual(await getInstitutions({program: "inexistente", page: 1, limit: 12}), []);
  assert.equal(requests, 1);
});

test("institution catalog does not query programs unless modalities are requested", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests += 1;
    return new Response(JSON.stringify([{
      c_digo_instituci_n: "1101", nombre_instituci_n: "UNIVERSIDAD NACIONAL DE COLOMBIA",
    }]));
  });
  const institutions = await getInstitutions({page: 1, limit: 12});
  assert.equal(requests, 1);
  assert.equal(institutions[0].modalities, undefined);
});

test("institution endpoint returns hasMore without exposing the lookahead row", async t => {
  const limits = [];
  t.mock.method(globalThis, "fetch", async url => {
    limits.push([url.searchParams.get("$limit"), url.searchParams.get("$offset")]);
    const offset = Number(url.searchParams.get("$offset"));
    const count = offset === 0 ? 13 : offset === 12 ? 12 : 1;
    return new Response(JSON.stringify(Array.from({length: count}, (_, index) => ({
      c_digo_instituci_n: String(offset + index + 1),
      nombre_instituci_n: `Institución ${offset + index + 1}`,
    }))));
  });

  const server = app.listen(0);
  t.after(() => server.close());
  async function page(number) {
    return new Promise((resolve, reject) => {
      httpGet(`http://127.0.0.1:${server.address().port}/api/institutions?page=${number}&limit=12`, response => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => { body += chunk; });
        response.on("end", () => resolve(JSON.parse(body)));
        response.on("error", reject);
      }).on("error", reject);
    });
  }

  const first = await page(1);
  assert.equal(first.returned, 12);
  assert.equal(first.data.length, 12);
  assert.equal(first.hasMore, true);
  const second = await page(2);
  assert.equal(second.returned, 12);
  assert.equal(second.hasMore, false);
  const third = await page(3);
  assert.equal(third.returned, 1);
  assert.equal(third.hasMore, false);
  assert.deepEqual(limits, [["13", "0"], ["13", "12"], ["13", "24"]]);
});
