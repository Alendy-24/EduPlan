package com.eduplan.account;

import com.eduplan.BackendApplication;
import com.eduplan.auth.CuentaPrincipal;
import com.eduplan.auth.JwtService;
import com.eduplan.repositories.CuentaRepository;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import static org.junit.jupiter.api.Assertions.*;

/** Starts fresh PostgreSQL and applies all migrations; no personal database is used. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AccountExplorationIntegrationTest {
    private EmbeddedPostgres postgres;
    private ConfigurableApplicationContext context;
    private String base;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = new JsonMapper();
    private record Account(String token, long id) {}

    @BeforeAll void start() throws Exception {
        postgres = EmbeddedPostgres.builder().setPort(0).start();
        context = new SpringApplicationBuilder(BackendApplication.class).run(
                "--spring.datasource.url=" + postgres.getJdbcUrl("postgres", "postgres"),
                "--spring.datasource.username=postgres", "--spring.datasource.password=postgres",
                "--server.port=0", "--server.address=127.0.0.1",
                "--eduplan.jwt.secret=Y2ktdGVzdC1qd3Qtc2VjcmV0LXNob3VsZC1iZS1sb25nLWVub3VnaC0zMi1ieXRlcw==",
                "--logging.level.org.springframework=WARN");
        base = "http://127.0.0.1:" + context.getEnvironment().getProperty("local.server.port");
    }

    @AfterAll void stop() throws Exception {
        if (context != null) context.close();
        if (postgres != null) postgres.close();
    }

    private HttpResponse<String> request(String method, String route, String token, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create(base + route)).header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode data(HttpResponse<String> response) { return json.readTree(response.body()); }

    private Account register() throws Exception {
        var response = request("POST", "/api/auth/register", null, Map.of("name", "Persona de prueba",
                "email", "saved-" + UUID.randomUUID() + "@example.test", "password", "Password123!"));
        assertEquals(201, response.statusCode(), response.body());
        JsonNode account = data(response);
        return new Account(account.get("token").asText(), account.get("userId").asLong());
    }

    private Map<String, Object> saved(String name) {
        return Map.of("type", "program", "name", name, "href", "/programas/No%20especifica?registro=upr9-nkiz%3Arow-test",
                "snapshot", Map.of("sourceId", "upr9-nkiz:row-test", "code", "No especifica", "status", "Activo", "name", name));
    }

    @Test void accountDetailsCanBeEditedWithoutChangingEmailOrAnotherAccount() throws Exception {
        Account first = register(), second = register();
        assertEquals(401, request("GET", "/api/me/account", null, null).statusCode());
        var original = data(request("GET", "/api/me/account", first.token(), null));
        String email = original.get("email").asText();
        assertEquals("Persona de prueba", original.get("name").asText());
        var updated = request("PUT", "/api/me/account", first.token(), Map.of("name", "  Nuevo nombre  ", "phone", "310 123 4567"));
        assertEquals(200, updated.statusCode(), updated.body());
        assertEquals("Nuevo nombre", data(updated).get("name").asText());
        assertEquals("3101234567", data(updated).get("phone").asText());
        assertEquals(email, data(updated).get("email").asText());
        assertEquals("Persona de prueba", data(request("GET", "/api/me/account", second.token(), null)).get("name").asText());
        assertEquals(400, request("PUT", "/api/me/account", first.token(), Map.of("name", "   ", "phone", "")).statusCode());
        assertEquals(400, request("PUT", "/api/me/account", first.token(), Map.of("name", "x".repeat(121), "phone", "")).statusCode());
        assertEquals(409, request("PUT", "/api/me/account", second.token(), Map.of("name", "Otra persona", "phone", "3101234567")).statusCode());
        assertEquals("Nuevo nombre", data(request("GET", "/api/me/account", first.token(), null)).get("name").asText());
        var login = request("POST", "/api/auth/login", null, Map.of("identifier", email, "password", "Password123!"));
        assertEquals(200, login.statusCode());
        assertEquals("Nuevo nombre", data(login).get("name").asText());
        assertEquals(200, request("POST", "/api/auth/login", null, Map.of("identifier", "3101234567", "password", "Password123!")).statusCode());
    }

    @Test void academicPreferencesPersistAndAreIsolatedByJwt() throws Exception {
        Account a = register(), b = register();
        var value = Map.of("academicLevel", "Pregrado", "modality", "Virtual", "municipality", "Bogotá", "department", "Bogotá D.C.", "mobility", "CITY");
        assertEquals(401, request("GET", "/api/me/preferences", null, null).statusCode());
        assertEquals(200, request("PUT", "/api/me/preferences", a.token(), value).statusCode());
        var db = context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
        db.update("UPDATE estudiante SET nombre='Nombre existente',apellido='Apellido existente',grado='11',presupuesto=2500000 WHERE id_cuenta=?", a.id());
        assertEquals("Bogotá", data(request("GET", "/api/me/preferences", a.token(), null)).get("municipality").asText());
        assertEquals("", data(request("GET", "/api/me/preferences", b.token(), null)).get("municipality").asText());
        assertEquals(400, request("PUT", "/api/me/preferences", a.token(), Map.of("academicLevel", "Otro", "modality", "Virtual", "municipality", "", "department", "", "mobility", "CITY")).statusCode());
        assertEquals(400, request("PUT", "/api/me/preferences", a.token(), Map.of("academicLevel", "Pregrado", "modality", "", "municipality", "", "department", "", "mobility", "DEPARTMENT")).statusCode());
        assertEquals(200, request("PUT", "/api/me/preferences", a.token(), value).statusCode());
        assertEquals("Virtual", data(request("GET", "/api/me/preferences", a.token(), null)).get("modality").asText());
        var legacy = db.queryForMap("SELECT nombre,apellido,grado,presupuesto FROM estudiante WHERE id_cuenta=?", a.id());
        assertEquals("Nombre existente", legacy.get("nombre")); assertEquals("Apellido existente", legacy.get("apellido")); assertEquals("11", legacy.get("grado"));
        assertEquals(new java.math.BigDecimal("2500000.00"), legacy.get("presupuesto"));
        var entity = context.getBean(CuentaRepository.class).findById(a.id()).orElseThrow();
        var loginResponse = request("POST", "/api/auth/login", null, Map.of("identifier", entity.getCorreo(), "password", "Password123!"));
        assertEquals(200, loginResponse.statusCode(), loginResponse.body());
        var login = data(loginResponse);
        assertEquals("Bogotá", data(request("GET", "/api/me/preferences", login.get("token").asText(), null)).get("municipality").asText());
        assertEquals("", data(request("GET", "/api/me/preferences?userId=" + a.id(), b.token(), null)).get("municipality").asText());
        assertEquals(400, request("PUT", "/api/me/preferences", a.token(), Map.of("academicLevel", "Pregrado", "modality", "Virtual", "municipality", "x".repeat(101), "department", "", "mobility", "ANY")).statusCode());
        var longName = request("POST", "/api/auth/register", null, Map.of("name", "a".repeat(120), "email", "long-" + UUID.randomUUID() + "@example.test", "password", "Password123!"));
        assertEquals(201, longName.statusCode());
        assertEquals(200, request("PUT", "/api/me/preferences", data(longName).get("token").asText(), value).statusCode());
    }

    private Map<String,Object> matching() {
        return Map.of("specificNbcs",List.of("Ingeniería de sistemas telemática y afines"),
            "activities",List.of("Resolver problemas","Analizar datos"),"contexts",List.of("Datos"),
            "excludedNbcs",List.of("Administración"),"locationImportance","HIGH","modalityImportance","REQUIRED",
            "duration","MEDIUM","sector","PUBLIC","exclusionsReviewed",true);
    }

    @Test void matchingV2PersistsInPostgresAndIsIsolatedAcrossAccountsAndRelogin() throws Exception {
        Account first=register(),second=register();
        assertEquals(401,request("GET","/api/me/matching-preferences",null,null).statusCode());
        assertEquals(401,request("PUT","/api/me/matching-preferences",null,matching()).statusCode());
        var result=request("PUT","/api/me/matching-preferences",first.token(),matching());
        assertEquals(200,result.statusCode(),result.body());
        var loaded=data(request("GET","/api/me/matching-preferences",first.token(),null));
        assertEquals("HIGH",loaded.get("locationImportance").asText());
        assertEquals("Analizar datos",loaded.get("activities").get(1).asText());
        assertTrue(loaded.get("exclusionsReviewed").asBoolean());
        assertEquals(0,data(request("GET","/api/me/matching-preferences?userId="+first.id(),second.token(),null)).get("specificNbcs").size());
        var account=context.getBean(CuentaRepository.class).findById(first.id()).orElseThrow();
        var login=data(request("POST","/api/auth/login",null,Map.of("identifier",account.getCorreo(),"password","Password123!")));
        assertEquals(loaded,data(request("GET","/api/me/matching-preferences",login.get("token").asText(),null)));
        var db=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
        assertEquals("matching-v2.0",db.queryForObject("SELECT taxonomy_version FROM account_matching_preferences WHERE id_cuenta=?",String.class,first.id()));
        var basic=Map.of("academicLevel","Pregrado","educationLevel","UNIVERSITY","modality","Presencial","municipality","","department","","mobility","ANY");
        assertEquals(200,request("PUT","/api/me/preferences",first.token(),basic).statusCode());
        assertEquals("UNIVERSITY",data(request("GET","/api/me/preferences",first.token(),null)).get("educationLevel").asText());
        var invalid=new java.util.HashMap<String,Object>(basic);invalid.put("academicLevel","Posgrado");
        assertEquals(400,request("PUT","/api/me/preferences",first.token(),invalid).statusCode());
        invalid.put("academicLevel","Pregrado");invalid.put("educationLevel","SPECIALIZATION");
        assertEquals(400,request("PUT","/api/me/preferences",first.token(),invalid).statusCode());
    }

    @Test void matchingV2RejectsUnknownDuplicateContradictoryAndOversizedOptions() throws Exception {
        Account account=register();
        for(var invalid:List.of(Map.of("specificNbcs",List.of("toString")),Map.of("activities",List.of("Inventado")),
            Map.of("contexts",List.of("Personalidad")),Map.of("locationImportance","FORCE"),
            Map.of("specificNbcs",List.of("Administración")),Map.of("activities",List.of("Analizar datos","Analizar datos")),
            Map.of("specificNbcs",java.util.Collections.nCopies(9,"Medicina")))) {
            var body=new java.util.HashMap<String,Object>(matching());body.putAll(invalid);
            assertEquals(400,request("PUT","/api/me/matching-preferences",account.token(),body).statusCode());
        }
        assertEquals(400,request("PUT","/api/me/matching-preferences",account.token(),Map.of("activities",List.of())).statusCode());
        var normalized=new java.util.HashMap<String,Object>(matching());normalized.put("specificNbcs",List.of("  INGENIERIA DE SISTEMAS, TELEMATICA Y AFINES  "));
        var result=request("PUT","/api/me/matching-preferences",account.token(),normalized);
        assertEquals(200,result.statusCode(),result.body());assertEquals("Ingeniería de sistemas telemática y afines",data(result).get("specificNbcs").get(0).asText());
        var entity=context.getBean(CuentaRepository.class).findById(account.id()).orElseThrow();entity.setEstado(false);context.getBean(CuentaRepository.class).save(entity);
        assertEquals(403,request("GET","/api/me/matching-preferences",account.token(),null).statusCode());
        assertEquals(403,request("PUT","/api/me/matching-preferences",account.token(),matching()).statusCode());
    }

    @Test void requiresValidJwtAndExistingActiveAccount() throws Exception {
        assertEquals(401, request("GET", "/api/me/saved", null, null).statusCode());
        assertEquals(401, request("GET", "/api/me/interests", "invalid-token", null).statusCode());
        assertEquals(401, request("GET", "/api/me/matching-preferences", null, null).statusCode());
        assertEquals(401, request("PUT", "/api/me/matching-preferences", null, matching()).statusCode());
        assertEquals(401, request("PUT", "/api/me/saved/example", null, saved("Nombre")).statusCode());
        assertEquals(401, request("DELETE", "/api/me/saved/example", null, null).statusCode());
        String missing = context.getBean(JwtService.class).generateToken(new CuentaPrincipal(Long.MAX_VALUE, "missing@example.test"));
        assertEquals(401, request("GET", "/api/me/saved", missing, null).statusCode());
        Account account = register();
        CuentaRepository repository = context.getBean(CuentaRepository.class);
        var entity = repository.findById(account.id()).orElseThrow();
        entity.setEstado(false); repository.save(entity);
        assertEquals(403, request("GET", "/api/me/interests", account.token(), null).statusCode());
        assertEquals(403, request("PUT", "/api/me/saved/example", account.token(), saved("Nombre")).statusCode());
        repository.deleteById(account.id());
        assertEquals(401, request("GET", "/api/me/saved", account.token(), null).statusCode());
    }

    @Test void savesUpdatesAndDeletesOnlyForJwtOwner() throws Exception {
        Account first = register();
        Account second = register();
        String path = "/api/me/saved/program-upr9-nkiz:row-test";
        var created = request("PUT", path, first.token(), saved("Ingeniería de Sistemas"));
        assertEquals(200, created.statusCode(), created.body());
        JsonNode before = data(created);
        assertEquals("program-upr9-nkiz:row-test", before.get("id").asText());
        assertEquals("No especifica", before.get("snapshot").get("code").asText());
        assertEquals(0, data(request("GET", "/api/me/saved?userId=" + first.id(), second.token(), null)).get("data").size());
        assertEquals(204, request("DELETE", path, second.token(), null).statusCode());
        assertEquals(1, data(request("GET", "/api/me/saved", first.token(), null)).get("data").size());
        var updated = request("PUT", path, first.token(), saved("Nombre actualizado"));
        assertEquals(200, updated.statusCode());
        assertEquals(before.get("savedAt").asText(), data(updated).get("savedAt").asText());
        assertEquals("Nombre actualizado", data(updated).get("name").asText());
        assertTrue(data(updated).get("updatedAt").asText().compareTo(before.get("updatedAt").asText()) >= 0);
        assertEquals(200, request("PUT", path, second.token(), saved("Otra cuenta")).statusCode());
        assertEquals(2, context.getBean(SavedOptionRepository.class).findAll().stream()
                .filter(item -> item.getReference().equals("program-upr9-nkiz:row-test")).count());
        assertEquals(204, request("DELETE", path, first.token(), null).statusCode());
        assertEquals(204, request("DELETE", path, first.token(), null).statusCode());
        assertEquals(0, data(request("GET", "/api/me/saved", first.token(), null)).get("data").size());
        assertEquals("Otra cuenta", data(request("GET", "/api/me/saved", second.token(), null)).get("data").get(0).get("name").asText());
    }

    @Test void validatesReferencesInternalLinksAndSnapshots() throws Exception {
        Account account = register();
        for (String href : List.of("https://example.com", "//example.com", "/%2fexample.com", "/%5cexample.com", "/%0aexample.com")) {
            assertEquals(400, request("PUT", "/api/me/saved/invalid", account.token(),
                    Map.of("type", "program", "name", "Programa", "href", href)).statusCode(), href);
        }
        assertEquals(400, request("PUT", "/api/me/saved/" + "a".repeat(201), account.token(), saved("Programa")).statusCode());
        assertEquals(400, request("PUT", "/api/me/saved/invalid", account.token(), Map.of("type", "other", "name", "Programa", "href", "/programas")).statusCode());
        assertEquals(400, request("PUT", "/api/me/saved/invalid", account.token(), saved("a".repeat(501))).statusCode());
        for (Map<String, Object> snapshot : List.of(Map.<String, Object>of("sourceId", 123),
                Map.<String, Object>of("unknown", "value"), Map.<String, Object>of("name", Map.of("nested", "value")),
                Map.<String, Object>of("name", "é".repeat(2000), "institution", "é".repeat(2000), "city", "é".repeat(2000)))) {
            assertEquals(400, request("PUT", "/api/me/saved/invalid", account.token(),
                    Map.of("type", "program", "name", "Programa", "href", "/programas", "snapshot", snapshot)).statusCode());
        }
        assertEquals(0, data(request("GET", "/api/me/saved", account.token(), null)).get("data").size());
        assertEquals(200, request("PUT", "/api/me/saved/beca-1", account.token(), Map.of("type", "opportunity", "name", "Beca",
                "href", "/becas", "snapshot", Map.of("provider", "Entidad", "officialUrl", "https://example.com", "deadline", "2026-10-01"))).statusCode());
        assertEquals(200, request("PUT", "/api/me/saved/institution-1", account.token(), Map.of("type", "institution", "name", "Universidad",
                "href", "/instituciones/1", "snapshot", Map.of("sector", "Oficial", "academicCharacter", "Universidad", "website", "https://example.com"))).statusCode());
        var program = data(request("PUT", "/api/me/saved/program-snies", account.token(), Map.of("type", "program", "name", "Ingeniería de Sistemas",
                "href", "/programas/1", "snapshot", Map.of("nameOrigin", "SNIES_NAME", "awardedTitle", "Ingeniero de Sistemas"))));
        assertEquals("SNIES_NAME", program.get("snapshot").get("nameOrigin").asText());
        assertEquals("Ingeniero de Sistemas", program.get("snapshot").get("awardedTitle").asText());
    }

    @Test void persistsValidatedInterestsWithoutCrossAccountAccess() throws Exception {
        Account first = register(); Account second = register();
        var initial = data(request("GET", "/api/me/interests", first.token(), null));
        assertEquals(0, initial.get("areas").size()); assertTrue(initial.get("updatedAt").isNull());
        var stored = request("PUT", "/api/me/interests", first.token(), Map.of("areas", List.of("Tecnología", "Tecnología", "Salud"),
                "motivations", List.of("Resolver problemas", "Investigar"), "userId", second.id()));
        assertEquals(200, stored.statusCode(), stored.body());
        assertEquals(2, data(stored).get("areas").size()); assertFalse(data(stored).get("updatedAt").isNull());
        assertEquals(data(stored), data(request("GET", "/api/me/interests", first.token(), null)));
        assertEquals(0, data(request("GET", "/api/me/interests?userId=" + first.id(), second.token(), null)).get("areas").size());
        assertEquals(400, request("PUT", "/api/me/interests", first.token(), Map.of("areas", List.of("Inventada"), "motivations", List.of())).statusCode());
        assertEquals(400, request("PUT", "/api/me/interests", first.token(), Map.of("areas", List.of(), "motivations", List.of(""))).statusCode());
        assertEquals(400, request("PUT", "/api/me/interests", first.token(), Map.of("motivations", List.of())).statusCode());
        assertEquals(400, request("PUT", "/api/me/interests", first.token(), Map.of("areas", List.of(), "motivations", List.of("Inventada"))).statusCode());
        assertEquals(2, data(request("GET", "/api/me/interests", first.token(), null)).get("areas").size());
        var cleared = request("PUT", "/api/me/interests", first.token(), Map.of("areas", List.of(), "motivations", List.of()));
        assertEquals(200, cleared.statusCode()); assertEquals(0, data(cleared).get("areas").size());
    }

    @Test void concurrentPutsKeepOneReferencePerAccount() throws Exception {
        Account account = register();
        List<CompletableFuture<Integer>> requests = java.util.stream.IntStream.range(0, 8).mapToObj(i -> CompletableFuture.supplyAsync(() -> {
            try { return request("PUT", "/api/me/saved/same-reference", account.token(), saved("Programa " + i)).statusCode(); }
            catch (Exception exception) { throw new RuntimeException(exception); }
        })).toList();
        for (var request : requests) assertEquals(200, request.join());
        assertEquals(1, data(request("GET", "/api/me/saved", account.token(), null)).get("data").size());
        assertEquals(1, context.getBean(SavedOptionRepository.class).findByAccountIdOrderBySavedAtDescDatabaseIdDesc(account.id()).size());
    }
}
