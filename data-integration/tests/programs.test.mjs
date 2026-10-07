import { readFileSync } from 'node:fs';
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { get as httpGet } from "node:http";
import { app } from "../dist/app.js";
import { transformProgram, getPrograms, getProgramsByCode, getProgramFilterOptions, getProgramSearchPage } from "../dist/services/programs.service.js";
import { getInstitutions, clearInstitutionCatalogCache } from "../dist/services/institutions.service.js";
import { clearProgramCatalogCache, selectPrograms, getProgramCatalog, searchProgramOffers, groupProgramOffers } from '../dist/services/program-catalog.js';
beforeEach(() => { clearInstitutionCatalogCache(); clearProgramCatalogCache(); });

const row = {
  source_row_id: "row-gwwh_nn2q.c23h", codigoprograma: "5", codigoinstitucion: "2209",
  nombreprograma: "Antioquia", nombredepartprograma: "Antioquia",
  nombremunicipioprograma: "Abejorral", nombremetodologia: "Presencial",
  nombretituloobtenido: "LICENCIADO EN EDUCACION FISICA RECREACION Y DEPORTE",
  nombrenbc: "Educación"
};

const official = JSON.parse(readFileSync(new URL('../data/snies-program-names.json', import.meta.url))).records[0];
const namedRow = {...row, codigoinstitucion:official[1], nombretituloobtenido:official[3],
  nombrenivelacademico:official[4], nombremetodologia:official[5], nombremunicipioprograma:official[6]};

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
    return Response.json([{ ...namedRow, codigoprograma: 'No especifica' }, { ...namedRow, source_row_id: 'other-row', codigoprograma: 'No especifica' }]);
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
    assert.equal(url.searchParams.get("$offset"), "0");
    return new Response(JSON.stringify([namedRow]));
  });
  assert.equal((await getPrograms({page: 1, limit: 100}))[0].sourceId, "upr9-nkiz:" + row.source_row_id);
});

test('official academic names participate in search before pagination with all filters', () => {
  const base = { ...transformProgram(row), reviewRequired: false, nameOrigin: 'SNIES_NAME', name: 'Medicina', awardedTitle: 'MÉDICO', academicLevel: 'Pregrado', knowledgeArea: 'Salud', institutionCode: '1701', municipality: 'Bogotá', modality: 'Presencial' };
  const programs = Array.from({length: 20}, (_, i) => ({...base, sourceId: 'upr9-nkiz:' + String(i).padStart(3,'0')}));
  programs.push({...base, sourceId: 'other-institution', institutionCode: '1702'}, {...base, sourceId: 'other-level', academicLevel: 'Posgrado'});
  const result = selectPrograms(programs, {name:'medicina', municipality:'bogota', institutionCode:'1701', modality:'Presencial', academicLevel:'Pregrado', knowledgeArea:'Salud', page:2, limit:12});
  assert.equal(result.length,8); assert(result.every(p => p.searchMatch === 'EXACT_NAME_OR_TITLE' && p.name === 'Medicina'));
  assert.equal(result[0].sourceId, 'upr9-nkiz:012');
  assert.equal(selectPrograms(programs, {name:'médico', page:1,limit:12}).length,12);
});
test('search retains title variants as search matches without converting display names', () => {
  const base = {...transformProgram(row), name:'Ingeniería en Sistemas', nameOrigin:'SNIES_NAME', reviewRequired:false, awardedTitle:'INGENIERO(A) DE SISTEMAS'};
  const result = selectPrograms([base], {name:'ingenieria de sistemas', page:1,limit:12});
  assert.equal(result.length,1); assert.equal(result[0].name, 'Ingeniería en Sistemas');
  assert.equal(result[0].searchMatch, 'SIMILAR_NAME_OR_TITLE');
});
test('global alphabetical ordering uses joined academic names before pagination', () => {
  const programs = ['Zootecnia','Medicina','Arquitectura'].map((name,i) => ({...transformProgram(row),name,reviewRequired:false,nameOrigin:'SNIES_NAME',sourceId:'upr9-nkiz:' + i}));
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
  assert.equal(requests.length, 6);
  assert.equal(await getProgramFilterOptions(), options);
  assert.equal(requests.length, 6);
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

 test('career search matches expanded and reordered names across disciplines in both directions', () => {
  const pairs = [
    ['Ingeniería de Sistemas', 'Ingeniería de Sistemas y Computación'],
    ['Administración de Empresas', 'Administración y Dirección de Empresas'],
    ['Comunicación Social', 'Comunicación Social y Periodismo'],
    ['Contaduría Pública', 'Contaduría Pública y Finanzas'],
    ['Medicina Veterinaria', 'Medicina Veterinaria y Zootecnia'],
    ['Ingeniería de Sistemas', 'Ingeniería en Sistemas'],
    ['Diseño Visual', 'Diseño de Comunicación Visual'],
  ];
  for (const [short, expanded] of pairs) {
    for (const [query, name] of [[short, expanded], [expanded, short]]) {
      const program = {...transformProgram(row), name, reviewRequired:false,nameOrigin:'SNIES_NAME', awardedTitle:''};
      assert.equal(selectPrograms([program], {name:query,page:1,limit:12}).length, 1, `${query}: ${name}`);
    }
  }
  const programs = ['Ingeniería Civil','Ingeniería Industrial','Ingeniería de Sistemas y Computación','Ingeniería de Sistemas']
    .map((name,i) => ({...transformProgram(row),sourceId:`upr9-nkiz:${i}`,name,reviewRequired:false,nameOrigin:'SNIES_NAME',awardedTitle:'',knowledgeArea:''}));
  const filters = {name:'ingenieria de sistemas',page:1,limit:1};
  assert.equal(selectPrograms(programs,filters)[0].name,'Ingeniería de Sistemas');
  assert.equal(selectPrograms(programs,{...filters,page:2})[0].name,'Ingeniería de Sistemas y Computación');
  assert.equal(selectPrograms(programs,{...filters,page:3}).length,0);
});

test('unavailable names are excluded before ranking and pagination in every listing', () => {
  const valid = {...transformProgram(namedRow), knowledgeArea:'Sistemas'};
  const unavailable = {...transformProgram(row), awardedTitle:'INGENIERO DE SISTEMAS', knowledgeArea:'Sistemas'};
  const programs = [unavailable, {...valid,sourceId:'upr9-nkiz:valid-1'},
    {...valid,sourceId:'upr9-nkiz:review',reviewRequired:true},
    {...valid,sourceId:'upr9-nkiz:blank',name:' '}, {...valid,sourceId:'upr9-nkiz:valid-2'}];
  for (const extra of [{},{order:'asc'},{order:'desc'},{name:'Sistemas'}]) {
    const first = selectPrograms(programs,{...extra,page:1,limit:1});
    const second = selectPrograms(programs,{...extra,page:2,limit:1});
    assert.equal(first.length,1); assert.equal(second.length,1);
    assert.notEqual(first[0].sourceId,second[0].sourceId);
    assert.equal(selectPrograms(programs,{...extra,page:3,limit:1}).length,0);
    assert(first.every(program => program.nameOrigin === 'SNIES_NAME' && !program.reviewRequired));
  }
});

test('default listing and details omit source rows without resolved academic names', async t => {
  t.mock.method(globalThis,'fetch', async url => url.pathname.includes('upr9-nkiz')
    ? Response.json([row,{...namedRow,source_row_id:'named-row'}]) : Response.json([]));
  const listing = await getPrograms({page:1,limit:12});
  assert.deepEqual(listing.map(program => program.sourceId), ['upr9-nkiz:named-row']);
  assert.equal((await getProgramsByCode('5')).length,1);
});

test('department and city filters separate homonymous municipalities and normalize Bogotá', () => {
  const base = transformProgram(namedRow);
  const programs = [
    {...base,sourceId:'upr9-nkiz:antioquia',department:'Antioquia',municipality:'La Unión'},
    {...base,sourceId:'upr9-nkiz:valle',department:'Valle del Cauca',municipality:'La Unión'},
    {...base,sourceId:'upr9-nkiz:bogota',department:'Bogotá D.C.',municipality:'Bogotá, D.C.'},
    {...base,sourceId:'upr9-nkiz:cali',department:'Valle del Cauca',municipality:'Cali'},
  ];
  assert.deepEqual(selectPrograms(programs,{department:'ANTIOQUIA',municipality:'la union',page:1,limit:12}).map(p=>p.sourceId), ['upr9-nkiz:antioquia']);
  assert.equal(selectPrograms(programs,{department:'Bogotá, D.C.',municipality:'Bogotá',page:1,limit:12})[0].sourceId,'upr9-nkiz:bogota');
  assert.equal(selectPrograms(programs,{department:'Valle del Cauca',municipality:'Santiago de Cali',page:1,limit:12})[0].sourceId,'upr9-nkiz:cali');
  assert.equal(selectPrograms(programs,{department:'Valle del Cauca',page:1,limit:12}).length,2);
});

test('institution alphabetical order is global before pagination and keeps name tie breaks', () => {
  const base = transformProgram(namedRow);
  const programs = [
    {...base,sourceId:'upr9-nkiz:z',institutionName:'Universidad Zeta',name:'Administración'},
    {...base,sourceId:'upr9-nkiz:b',institutionName:'Universidad Ágora',name:'Medicina'},
    {...base,sourceId:'upr9-nkiz:a',institutionName:'Universidad Ágora',name:'Arquitectura'},
  ];
  assert.deepEqual([1,2,3].map(page=>selectPrograms(programs,{order:'institution-asc',page,limit:1})[0].sourceId),['upr9-nkiz:a','upr9-nkiz:b','upr9-nkiz:z']);
});

test('typo search matches omissions and swapped letters without crossing unrelated careers', () => {
  const base = {...transformProgram(namedRow),awardedTitle:'',knowledgeArea:''};
  const programs = ['Psicología','Ingeniería de Sistemas','Ingeniería Civil','Ingeniería Química'].map((name,i)=>({...base,name,sourceId:`upr9-nkiz:typo-${i}`}));
  for (const query of ['sicologia','psciologia','psiclogia']) {
    const matches=selectPrograms(programs,{name:query,page:1,limit:12});
    assert.deepEqual(matches.map(p=>p.name),['Psicología']);
    assert.equal(matches[0].searchMatch,query === 'sicologia' ? 'SIMILAR_NAME_OR_TITLE' : 'SPELLING_VARIANT');
  }
  assert.deepEqual(selectPrograms(programs,{name:'ingeneria de sitemas',page:1,limit:12}).map(p=>p.name),['Ingeniería de Sistemas']);
  assert.deepEqual(selectPrograms(programs,{name:'ingenieria civil',page:1,limit:12}).map(p=>p.name),['Ingeniería Civil']);
});

test('offer grouping requires official identity and preserves locations, modalities and curriculum differences', () => {
  const base=transformProgram(namedRow);
  const programs=[{...base,sourceId:'upr9-nkiz:z'}, {...base,sourceId:'upr9-nkiz:a'},
    {...base,sourceId:'upr9-nkiz:virtual',modality:'Virtual'}, {...base,sourceId:'upr9-nkiz:city',municipality:'Otra ciudad'},
    {...base,sourceId:'upr9-nkiz:credits',credits:'999'}, {...base,sourceId:'upr9-nkiz:other-snies',sniesCode:'999999'},
    {...base,sourceId:'upr9-nkiz:unknown-a',sniesCode:''}, {...base,sourceId:'upr9-nkiz:unknown-b',sniesCode:''}];
  const grouped=groupProgramOffers(programs);
  assert.equal(grouped.length,7);
  assert.deepEqual(grouped.find(p=>p.sourceId==='upr9-nkiz:a').groupedSourceIds,['upr9-nkiz:a','upr9-nkiz:z']);
  assert.equal(programs.length,8);
  assert.equal(groupProgramOffers([programs[0]])[0].offerId,groupProgramOffers([programs[1]])[0].offerId);
  assert.notEqual(groupProgramOffers([programs[0]])[0].offerId,groupProgramOffers([programs[2]])[0].offerId);
});

test('facet counts and totals use grouped offers across all pages and omit only their own filter', () => {
  const base={...transformProgram(namedRow),name:'Psicología',awardedTitle:'Psicólogo',knowledgeArea:'Psicología',department:'Antioquia',municipality:'Medellín',academicLevel:'Pregrado',modality:'Presencial'};
  const programs=[{...base,sourceId:'upr9-nkiz:a'}, {...base,sourceId:'upr9-nkiz:duplicate'},
    {...base,sourceId:'upr9-nkiz:virtual',modality:'Virtual'}, {...base,sourceId:'upr9-nkiz:bogota',department:'Bogotá D.C.',municipality:'Bogotá D.C.'}];
  const filters={name:'sicologia',department:'Antioquia',modality:'Presencial',page:1,limit:1};
  const result=searchProgramOffers(programs,filters);
  assert.equal(result.total,1); assert.equal(result.hasMore,false);
  assert.deepEqual(result.facets.modality,[{value:'Presencial',count:1},{value:'Virtual',count:1}]);
  assert.deepEqual(result.facets.department,[{value:'Antioquia',count:1},{value:'Bogotá D.C.',count:1}]);
  const all=searchProgramOffers(programs,{name:'Psicología',page:1,limit:1});
  assert.equal(all.total,3); assert.equal(all.hasMore,true);
  assert.equal(searchProgramOffers(programs,{name:'Psicología',page:3,limit:1}).hasMore,false);
});

test('empty search alternatives keep the career and other filters and count actual results', () => {
  const base={...transformProgram(namedRow),name:'Psicología',awardedTitle:'Psicólogo',knowledgeArea:'Psicología',department:'Antioquia',municipality:'Medellín',modality:'Presencial'};
  const result=searchProgramOffers([base],{name:'sicologia',department:'Antioquia',municipality:'Bello',modality:'Presencial',page:1,limit:12});
  assert.equal(result.total,0);
  assert.deepEqual(result.alternatives,[{remove:['municipality'],count:1},{remove:['department','municipality'],count:1}]);
  assert.equal(searchProgramOffers([base],{name:'arquitectura',department:'Antioquia',page:1,limit:12}).alternatives.length,0);
});


test('multiple modalities use OR within the filter and AND with formation and sector before pagination',()=>{
  const base={...transformProgram(namedRow),name:'Psicología',nameOrigin:'SNIES_NAME',reviewRequired:false,academicLevel:'Pregrado',educationLevel:'Universitaria',institutionSector:'Oficial',modality:'Presencial'};
  const programs=[base,{...base,sourceId:'upr9-nkiz:virtual',modality:'Virtual'},
    {...base,sourceId:'upr9-nkiz:distance',modality:'Distancia'},
    {...base,sourceId:'upr9-nkiz:private',institutionCode:'1702',institutionSector:'Privada'},
    {...base,sourceId:'upr9-nkiz:technical',educationLevel:'Técnica profesional'}];
  const filters={modality:['Presencial','Virtual'],institutionSector:'Oficial',educationLevel:'Universitaria',page:1,limit:1};
  const result=searchProgramOffers(programs,filters);
  assert.equal(result.total,2); assert.equal(result.data.length,1); assert.equal(result.hasMore,true);
  assert.equal(searchProgramOffers(programs,{...filters,page:2}).hasMore,false);
  assert.deepEqual(result.facets.modality.map(item=>[item.value,item.count]),[['Distancia',1],['Presencial',1],['Virtual',1]]);
  assert.deepEqual(result.facets.institutionSector.map(item=>[item.value,item.count]),[['Oficial',2],['Privada',1]]);
  assert.equal(result.facets.educationLevel.find(item=>item.value==='Técnica profesional').count,1);
  const empty=searchProgramOffers(programs,{...filters,educationLevel:'Doctorado'});
  assert.equal(empty.total,0);
  assert.deepEqual(empty.alternatives.find(item=>item.remove[0]==='educationLevel'),{remove:['educationLevel'],count:3});
  assert.equal(searchProgramOffers(programs,{...filters,modality:'Virtual',limit:12}).total,1);
});

test('program endpoint accepts repeated modalities and rejects malformed arrays and sector filters',async t=>{
  t.mock.method(globalThis,'fetch',async url=>Response.json(url.searchParams.get('$select').includes('source_row_id') ? [namedRow,{...namedRow,source_row_id:'virtual-row',nombremetodologia:'Virtual'}] : []));
  const server=app.listen(0);t.after(()=>server.close());
  const get=path=>new Promise((resolve,reject)=>httpGet(`http://127.0.0.1:${server.address().port}/api/programs${path}`,res=>{
    let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));res.on('error',reject);
  }).on('error',reject));
  const result=await get('?modality=Presencial&modality=Virtual');
  assert.equal(result.status,200);
  assert(result.body.data.every(program=>['Presencial','Virtual'].includes(program.modality)));
  assert.equal((await get('?modality=&modality=Virtual')).status,400);
  assert.equal((await get('?'+Array(13).fill('modality=Virtual').join('&'))).status,400);
  assert.equal((await get('?institutionSector=Oficial&institutionSector=Privada')).status,400);
});


test('sector search uses institution data across the full catalog and reports an outage instead of false empty results',async t=>{
  let available=true;
  t.mock.method(globalThis,'fetch',async url=>{
    if (url.searchParams.get('$select').includes('source_row_id')) return Response.json([namedRow]);
    if (!available) throw new Error('institution outage');
    return Response.json([{c_digo_instituci_n:namedRow.codigoinstitucion,nombre_instituci_n:'Institución oficial de prueba',sector:'Oficial'}]);
  });
  const filters={institutionSector:'Oficial',page:1,limit:12};
  const page=await getProgramSearchPage(filters);
  assert.equal(page.total,1);
  assert.equal(page.data[0].institutionSector,'Oficial');
  assert.deepEqual(page.facets.institutionSector,[{value:'Oficial',count:1}]);
  available=false;clearInstitutionCatalogCache();
  await assert.rejects(getProgramSearchPage(filters),/tipo de institución/);
  const fallback=await getProgramSearchPage({page:1,limit:12});
  assert.equal(fallback.total,1);
  assert.equal(fallback.data[0].institutionEnrichmentUnavailable,true);
});
