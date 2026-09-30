import test from "node:test";
import assert from "node:assert/strict";
import { get as httpGet } from "node:http";
import { app } from "../dist/app.js";
import { transformProgram, getPrograms, getProgramsByCode, getProgramFilterOptions } from "../dist/services/programs.service.js";
import { getInstitutions } from "../dist/services/institutions.service.js";

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

test("suspicious names retain raw data and explicitly use the awarded title", () => {
  const program = transformProgram(row);
  assert.equal(program.rawName, "Antioquia");
  assert.equal(program.name, row.nombretituloobtenido);
  assert.equal(program.nameOrigin, "AWARDED_TITLE");
  assert.equal(program.reviewRequired, true);
});

test("missing title does not invent a program name", () => {
  const program = transformProgram({...row, nombretituloobtenido: "NA"});
  assert.equal(program.nameOrigin, "UNAVAILABLE");
  assert.equal(program.reviewRequired, true);
});

test("plausible original name is preserved, but is not certified by this heuristic", () => {
  const program = transformProgram({...row, nombreprograma: "INGENIERIA DE SISTEMAS"});
  assert.equal(program.name, "INGENIERIA DE SISTEMAS");
  assert.equal(program.nameOrigin, "SOURCE_NAME");
  assert.equal(program.reviewRequired, false);
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

test("search ranks the entire source before pagination and preserves filters and published fields", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url.searchParams.get("$order"), "search_rank,:id");
    assert.equal(url.searchParams.get("$limit"), "12");
    assert.equal(url.searchParams.get("$offset"), "12");
    const select = url.searchParams.get("$select"), where = url.searchParams.get("$where");
    assert.match(select, /case\(.+ as search_rank$/);
    assert.match(select, /true, 4/);
    assert.match(where, /INGENIERIA DE SISTEMAS/);
    assert.match(where, /INGENIERO\(A\) DE SISTEMAS/);
    assert.match(where, /upper\(unaccent\(nombremunicipioprograma\)\)/);
    assert.match(where, /nombremetodologia/);
    assert.match(where, /codigoinstitucion = 1101/);
    return Response.json(["0", "1", "2", "3", "4"].map((rank, i) => ({
      ...row, source_row_id: `rank-${i}`, search_rank: rank,
    })));
  });
  const programs = await getPrograms({ name: "  Ingeniería de Sistemas  ", municipality: "Bogotá", modality: "Presencial", institutionCode: "1101", page: 2, limit: 12 });
  assert.deepEqual(programs.map(p => p.searchMatch), ["EXACT_NAME_OR_TITLE", "SIMILAR_NAME_OR_TITLE", "SIMILAR_NAME_OR_TITLE", "SIMILAR_NAME_OR_TITLE", "KNOWLEDGE_AREA"]);
  assert(programs.every(p => p.rawName === row.nombreprograma && p.awardedTitle === row.nombretituloobtenido));
});

test("search escapes literals in both relevance and selection expressions", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    assert.match(url.searchParams.get("$select"), /D''ANGELO/);
    assert.match(url.searchParams.get("$where"), /D''ANGELO/);
    return Response.json([]);
  });
  assert.deepEqual(await getPrograms({ name: "d'angelo", page: 1, limit: 12 }), []);
});

test("global level and knowledge area filters apply in the paginated source query", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    const where = url.searchParams.get("$where");
    assert.match(where, /upper\(unaccent\(nombrenivelacademico\)\) = 'PREGRADO'/);
    assert.match(where, /upper\(unaccent\(nombrenbc\)\) = 'INGENIERIA DE SISTEMAS TELEMATICA Y AFINES'/);
    assert.match(where, /codigoinstitucion = 1101/);
    assert.equal(url.searchParams.get("$offset"), "24");
    assert.equal(url.searchParams.get("$order"), "search_rank,:id");
    return Response.json([]);
  });
  assert.deepEqual(await getPrograms({ name: "sistemas", academicLevel: "Pregrado", knowledgeArea: "Ingeniería de sistemas telemática y afines", institutionCode: "1101", page: 3, limit: 12 }), []);
});

test("alphabetical order uses a usable published name or awarded title before pagination", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async url => {
    requests.push(url);
    assert.match(url.searchParams.get("$select"), /coalesce\(upper\(unaccent\(nombretituloobtenido\)\), ''\)/);
    assert.match(url.searchParams.get("$select"), /as sort_name/);
    assert.equal(url.searchParams.get("$offset"), "12");
    return Response.json([]);
  });
  await getPrograms({ name: "sistemas", order: "asc", page: 2, limit: 12 });
  await getPrograms({ order: "desc", page: 2, limit: 12 });
  assert.deepEqual(requests.map(url => url.searchParams.get("$order")), ["sort_name ASC,:id", "sort_name DESC,:id"]);
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
  assert.equal(requests.length, 4);
  assert.equal(await getProgramFilterOptions(), options);
  assert.equal(requests.length, 4);
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
