package com.eduplan.auth;

import com.eduplan.BackendApplication;
import com.eduplan.repositories.CuentaRepository;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.net.URI;
import java.net.http.*;
import static org.junit.jupiter.api.Assertions.*;

/** Uses new embedded PostgreSQL, never the configured personal database. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthIntegrationTest {
    private EmbeddedPostgres postgres;
    private ConfigurableApplicationContext context;
    private String base;
    private final HttpClient http = HttpClient.newHttpClient();
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
    private HttpResponse<String> post(String route, String body) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create(base + "/api/auth/" + route))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void registersWithV4AndLogsInWithStoredHash() throws Exception {
        var response = post("register", "{\"name\":\"Ana Pérez\",\"email\":\"ana@example.org\",\"password\":\"Password123!\"}");
        assertEquals(201, response.statusCode());
        assertTrue(response.body().contains("Ana Pérez")); assertTrue(response.body().contains("Bearer"));
        var repository = context.getBean(CuentaRepository.class);
        var account = repository.findByCorreoIgnoreCase("ana@example.org").orElseThrow();
        assertEquals("Ana Pérez", account.getNombre());
        assertNotEquals("Password123!", account.getContrasena());
        assertTrue(context.getBean(PasswordEncoder.class).matches("Password123!", account.getContrasena()));
        assertEquals(200, post("login", "{\"identifier\":\"ANA@example.org\",\"password\":\"Password123!\"}").statusCode());
        assertEquals(401, post("login", "{\"identifier\":\"ana@example.org\",\"password\":\"incorrect\"}").statusCode());
        assertEquals(409, post("register", "{\"name\":\"Ana\",\"email\":\"ana@example.org\",\"password\":\"Password123!\"}").statusCode());
        account.setEstado(false); repository.save(account);
        assertEquals(403, post("login", "{\"identifier\":\"ana@example.org\",\"password\":\"Password123!\"}").statusCode());
    }
    @Test void rejectsMissingBlankAndOversizedUtf8Passwords() throws Exception {
        for (String password : new String[]{"null", "\"        \"", "\"" + "é".repeat(40) + "\""}) {
            assertEquals(400, post("register", "{\"name\":\"Persona\",\"email\":\"invalid@example.org\",\"password\":" + password + "}").statusCode());
        }
        assertEquals(400, post("register", "{\"email\":\"missing@example.org\",\"password\":\"Password123!\"}").statusCode());
        var oversizedEmail = post("register", "{\"name\":\"Persona\",\"email\":\"" + "a".repeat(60) + "@long-domain-example.org\",\"password\":\"Password123!\"}");
        assertEquals(400, oversizedEmail.statusCode());
        assertTrue(oversizedEmail.body().contains("80 caracteres"));
        assertFalse(oversizedEmail.body().contains("Password123!"));
    }
}
