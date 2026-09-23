import test from "node:test";
import assert from "node:assert/strict";
import { transformProgram, getPrograms } from "../dist/services/programs.service.js";
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
