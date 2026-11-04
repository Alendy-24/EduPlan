package com.eduplan.account;

import com.eduplan.BackendApplication;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Fresh, isolated PostgreSQL verifies migration, JWT ownership and persistence without touching development data. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class FinancingPreferencesIntegrationTest {
    private static final String ROUTE = "/api/me/financing-preferences";
    private EmbeddedPostgres postgres;
    private ConfigurableApplicationContext context;
    private String base;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = new JsonMapper();
    private record Account(String token, long id, String email) {}

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

    private HttpResponse<String> rawRequest(String method, String route, String token, String body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create(base + route)).header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> request(String method, String route, String token, Object body) throws Exception {
        return rawRequest(method, route, token, body == null ? null : json.writeValueAsString(body));
    }

    private JsonNode data(HttpResponse<String> response) { return json.readTree(response.body()); }

    private Account register() throws Exception {
        String email = "financing-" + UUID.randomUUID() + "@example.test";
        var response = request("POST", "/api/auth/register", null,
                Map.of("name", "Persona financiación", "email", email, "password", "Password123!"));
        assertEquals(201, response.statusCode(), response.body());
        var account = data(response);
        return new Account(account.get("token").asText(), account.get("userId").asLong(), email);
    }

    private Map<String, Object> preferences() {
        return Map.of("studentStage", "entry", "support", "tuition", "repayment", "no",
                "international", "no", "admission", "no", "nationality", "Colombianos");
    }

    @Test void preferencesPersistAcrossReloadAndLoginWithoutCopyingAcademicProfile() throws Exception {
        Account first = register(), second = register();
        var db = context.getBean(JdbcTemplate.class);
        assertEquals(0L, db.queryForObject("SELECT count(*) FROM account_financing_preferences WHERE id_cuenta=?", Long.class, first.id()));
        assertEquals(json.valueToTree(FinancingPreferences.empty()), data(request("GET", ROUTE, first.token(), null)));
        var academic = Map.of("academicLevel", "Pregrado", "educationLevel", "UNIVERSITY", "modality", "Virtual",
                "municipality", "Bogotá", "department", "Bogotá D.C.", "mobility", "CITY");
        assertEquals(200, request("PUT", "/api/me/preferences", first.token(), academic).statusCode());
        var academicBefore = data(request("GET", "/api/me/preferences", first.token(), null));
        var saved = request("PUT", ROUTE, first.token(), preferences());
        assertEquals(200, saved.statusCode(), saved.body());
        assertEquals(json.valueToTree(preferences()), data(saved));
        assertEquals(data(saved), data(request("GET", ROUTE, first.token(), null)));
        assertEquals(academicBefore, data(request("GET", "/api/me/preferences", first.token(), null)));
        assertEquals(json.valueToTree(FinancingPreferences.empty()), data(request("GET", ROUTE + "?userId=" + first.id(), second.token(), null)));
        var login = request("POST", "/api/auth/login", null, Map.of("identifier", first.email(), "password", "Password123!"));
        assertEquals(200, login.statusCode(), login.body());
        assertEquals(data(saved), data(request("GET", ROUTE, data(login).get("token").asText(), null)));
        var changed = new HashMap<>(preferences()); changed.put("studentStage", "enrolled"); changed.put("support", "living");
        assertEquals(200, request("PUT", ROUTE, first.token(), changed).statusCode());
        assertEquals("living", data(request("GET", ROUTE, first.token(), null)).get("support").asText());
        assertEquals("", data(request("GET", ROUTE, second.token(), null)).get("support").asText());
        assertEquals(200, request("PUT", ROUTE, first.token(), FinancingPreferences.empty()).statusCode());
        assertEquals(json.valueToTree(FinancingPreferences.empty()), data(request("GET", ROUTE, first.token(), null)));
    }

    @Test void authorizationRequiresValidJwtAndAnActiveAccount() throws Exception {
        assertEquals(401, request("GET", ROUTE, null, null).statusCode());
        assertEquals(401, request("PUT", ROUTE, null, preferences()).statusCode());
        assertEquals(401, request("GET", ROUTE, "invalid.jwt.value", null).statusCode());
        Account account = register();
        context.getBean(JdbcTemplate.class).update("UPDATE cuenta SET estado=false WHERE id_cuenta=?", account.id());
        assertEquals(403, request("GET", ROUTE, account.token(), null).statusCode());
        assertEquals(403, request("PUT", ROUTE, account.token(), preferences()).statusCode());
    }

    @Test void invalidValuesUnknownFieldsMissingFieldsAndMalformedJsonCannotOverwriteChoices() throws Exception {
        Account account = register();
        assertEquals(200, request("PUT", ROUTE, account.token(), preferences()).statusCode());
        for (var entry : List.of(Map.entry("studentStage", "graduate"), Map.entry("support", "everything"),
                Map.entry("repayment", "free"), Map.entry("international", "true"),
                Map.entry("admission", "preselected"), Map.entry("nationality", "Todas"))) {
            var invalid = new HashMap<>(preferences()); invalid.put(entry.getKey(), entry.getValue());
            assertEquals(400, request("PUT", ROUTE, account.token(), invalid).statusCode(), entry.toString());
        }
        var unknown = new HashMap<>(preferences()); unknown.put("userId", account.id());
        assertEquals(400, request("PUT", ROUTE, account.token(), unknown).statusCode());
        var missing = new HashMap<>(preferences()); missing.remove("support");
        assertEquals(400, request("PUT", ROUTE, account.token(), missing).statusCode());
        for (Object value : List.of(5, true, List.of("tuition"), Map.of("support", "tuition"), "x".repeat(200), "tuition\n")) {
            var invalid = new HashMap<>(preferences()); invalid.put("support", value);
            assertEquals(400, request("PUT", ROUTE, account.token(), invalid).statusCode());
        }
        var nullable = new HashMap<>(preferences()); nullable.put("support", null);
        assertEquals(400, request("PUT", ROUTE, account.token(), nullable).statusCode());
        for (String value : List.of("{", "[]", "null", "\"text\"")) assertEquals(400, rawRequest("PUT", ROUTE, account.token(), value).statusCode());
        assertEquals(json.valueToTree(preferences()), data(request("GET", ROUTE, account.token(), null)));
    }

    @Test void databaseConstraintsAndCascadeKeepOptionsAccountOwned() throws Exception {
        Account account = register();
        assertEquals(200, request("PUT", ROUTE, account.token(), preferences()).statusCode());
        var db = context.getBean(JdbcTemplate.class);
        assertTrue(db.queryForObject("SELECT updated_at IS NOT NULL FROM account_financing_preferences WHERE id_cuenta=?", Boolean.class, account.id()));
        db.update("DELETE FROM cuenta WHERE id_cuenta=?", account.id());
        assertEquals(0L, db.queryForObject("SELECT count(*) FROM account_financing_preferences WHERE id_cuenta=?", Long.class, account.id()));
    }
}
