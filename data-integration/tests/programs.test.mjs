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
