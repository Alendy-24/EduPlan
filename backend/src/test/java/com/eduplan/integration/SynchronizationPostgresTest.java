package com.eduplan.integration;

import com.eduplan.BackendApplication;
import com.eduplan.entities.ProgramaAcademico;
import com.eduplan.integration.dto.*;
import com.eduplan.repositories.*;
import com.sun.net.httpserver.HttpServer;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.postgresql.ds.PGSimpleDataSource;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SynchronizationPostgresTest {
    private EmbeddedPostgres postgres;
    private ConfigurableApplicationContext context;
    private HttpServer source;
    private JdbcTemplate jdbc;
    private DataPagePersistenceService persistence;
    private InstitucionRepository institutions;
    private ProgramaAcademicoRepository programs;
    private DataSynchronizationService sync;
    private volatile int failOnPage;
    private volatile boolean malformed;
    private volatile boolean delay;
    private volatile int failProgramPage;
    private static final String TEST_TOKEN = "a-test-only-token-with-at-least-32-bytes";

    @BeforeAll
    void start() throws Exception {
        // Real isolated PostgreSQL; never points at DB_URL/eduplan_db.
        postgres = EmbeddedPostgres.builder().setPort(0).start();
        source = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        source.createContext("/api/institutions", exchange -> {
            int page = Integer.parseInt(exchange.getRequestURI().getQuery().split("&")[0].split("=")[1]);
            if (delay) {
                try { Thread.sleep(500); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
            String data = page == 1
                    ? "[{\"code\":\"2209\",\"name\":\"Universidad\"},{\"code\":\"1201\",\"name\":\"Otra universidad\"}]"
                    : "[]";
            String body = malformed ? "{\"data\":[],\"page\":99,\"limit\":2,\"returned\":0}"
                    : "{\"data\":" + data + ",\"page\":" + page + ",\"limit\":2,\"returned\":" + (page == 1 ? 2 : 0) + "}";
            if (page == failOnPage) body = "{\"error\":true}";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(page == failOnPage ? 502 : 200, bytes.length);
            try (var out = exchange.getResponseBody()) { out.write(bytes); }
            catch (java.io.IOException ignored) { /* expected for the timeout test */ }
        });
        source.createContext("/api/programs", exchange -> {
            int page = Integer.parseInt(exchange.getRequestURI().getQuery().split("&")[0].split("=")[1]);
            List<ProgramPayload> data = page == 1
                    ? List.of(program("first", "LICENCIADO", "Abejorral"), program("second", "TECNOLOGO", "Abejorral"))
                    : page == 2 ? List.of(program("third", "INGENIERO", "Abejorral")) : List.of();
            byte[] bytes = new tools.jackson.databind.json.JsonMapper()
                    .writeValueAsBytes(new IntegrationPage<>(data, page, 2, data.size()));
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(page == failProgramPage ? 502 : 200, bytes.length);
            try (var out = exchange.getResponseBody()) { out.write(bytes); }
        });
        source.start();
        context = new SpringApplicationBuilder(BackendApplication.class)
                .web(WebApplicationType.SERVLET)
                .run("--spring.datasource.url=" + postgres.getJdbcUrl("postgres", "postgres"),
                        "--server.port=0", "--server.address=127.0.0.1",
                        "--eduplan.data-integration.admin-token=" + TEST_TOKEN,
                        "--logging.level.org.springframework=WARN", "--logging.level.org.hibernate=WARN",
                        "--spring.datasource.username=postgres", "--spring.datasource.password=postgres",
                        "--spring.flyway.baseline-on-migrate=false",
                        "--eduplan.data-integration.base-url=http://127.0.0.1:" + source.getAddress().getPort(),
                        "--eduplan.data-integration.page-size=2");
        jdbc = context.getBean(JdbcTemplate.class);
        persistence = context.getBean(DataPagePersistenceService.class);
        institutions = context.getBean(InstitucionRepository.class);
        programs = context.getBean(ProgramaAcademicoRepository.class);
        sync = context.getBean(DataSynchronizationService.class);
    }

    @AfterAll
    void stop() throws Exception {
        if (context != null) context.close();
        if (source != null) source.stop(0);
        if (postgres != null) postgres.close();
    }

    @BeforeEach
    void clearOnlyTestDatabase() {
        jdbc.execute("TRUNCATE programa_academico, institucion RESTART IDENTITY CASCADE");
        failOnPage = 0;
        malformed = false;
        delay = false;
        failProgramPage = 0;
    }

    private InstitutionPayload institution(String code, String name) {
        return new InstitutionPayload(code, name, "Oficial", "Universidad", "Antioquia",
                "Abejorral", "", "", "Activa", "");
    }

    private ProgramPayload program(String rowId, String name, String city) {
        return new ProgramPayload("upr9-nkiz:row-" + rowId, "Antioquia", name, "Educación",
                "AWARDED_TITLE", true, "5", "2209", "Universidad", name, "Pregrado",
                "Universitaria", "Presencial", "10", "Semestral", "Antioquia", city, "Activo");
    }

    @Test
    void migratesAllEntitiesAndValidatesHibernate() {
        assertTrue(jdbc.queryForObject(
                "select count(*) from flyway_schema_history where success and type='SQL'", Integer.class) >= 2);
        // Context startup uses ddl-auto=validate: every entity and column has been checked.
        assertTrue(jdbc.queryForObject("select to_regclass('ayuda_financiera') is not null", Boolean.class));
    }

    @Test
    void sameFormerCompositeKeyKeepsBothRowsAndIsIdempotent() {
        persistence.saveInstitutions(List.of(institution("2209", "Universidad")));
        var a = program("first", "LICENCIADO EN EDUCACION", "Abejorral");
        var b = program("second", "TECNOLOGO AGROPECUARIO", "Abejorral");
        assertEquals(2, persistence.savePrograms(List.of(a, b)).created());
        assertEquals(2, persistence.savePrograms(List.of(a, b)).updated());
        assertEquals(2, programs.count());
        assertTrue(programs.findAll().stream().allMatch(ProgramaAcademico::isRequiereRevision));
    }

    @Test
    void sameSourceRowUpdatesEvenWhenMunicipalityChangesAndKeepsManualFields() {
        persistence.saveInstitutions(List.of(institution("2209", "Universidad")));
        persistence.savePrograms(List.of(program("one", "Titulo original", "Abejorral")));
        var saved = programs.findAll().getFirst();
        Long id = saved.getIdPrograma();
        saved.setCosto(new BigDecimal("123.45"));
        saved.setDescripcion("Información manual");
        programs.save(saved);
        persistence.savePrograms(List.of(program("one", "Titulo actualizado", "Medellín")));
        var updated = programs.findById(id).orElseThrow();
        assertEquals(1, programs.count());
        assertEquals("Medellín", updated.getMunicipio());
        assertEquals(new BigDecimal("123.45"), updated.getCosto());
        assertEquals("Información manual", updated.getDescripcion());
        assertEquals("Antioquia", updated.getNombreOriginal());
        assertEquals("Titulo actualizado", updated.getTituloOtorgado());
    }

    @Test
    void invalidPageRollsBackEarlierWritesInThatPage() {
        String tooLongCode = "9".repeat(31);
        assertThrows(DataIntegrationException.class, () -> persistence.saveInstitutions(List.of(
                institution("2209", "Valida"), institution(tooLongCode, "Invalida"))));
        assertEquals(0, institutions.count());
    }

    @Test
    void unresolvedInstitutionIsReportedAndDoesNotCreateAnOrphan() {
        SyncReport report = persistence.savePrograms(List.of(program("missing", "Titulo", "Abejorral")));
        assertEquals(1, report.skipped());
        assertEquals(1, report.skippedReasons().get("missingInstitution"));
        assertEquals(0, programs.count());
    }

    @Test
    void legacyLossyHashesBlockImportInsteadOfGuessingOrDuplicating() {
        jdbc.update("insert into programa_academico(nombre, clave_fuente) values (?,?)", "Legacy", "a".repeat(64));
        var failure = assertThrows(SyncFailedException.class, sync::synchronizePrograms);
        assertInstanceOf(DataIntegrationException.class, failure.getCause());
        assertEquals(1, programs.count());
    }

    @Test
    void databaseFailureAfterAnInsertRollsBackEntirePage() {
        jdbc.execute("ALTER TABLE institucion ADD CONSTRAINT test_reject_name CHECK (nombre <> 'Rechazar')");
        try {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                    () -> persistence.saveInstitutions(List.of(
                            institution("2209", "Primera insertada"), institution("1201", "Rechazar"))));
            assertEquals(0, institutions.count());
        } finally {
            jdbc.execute("ALTER TABLE institucion DROP CONSTRAINT test_reject_name");
        }
    }

    @Test
    void multiplePagesAreFetchedAndSecondRunKeepsCounts() {
        assertEquals(2, sync.synchronizeInstitutions().created());
        assertEquals(2, sync.synchronizeInstitutions().updated());
        assertEquals(2, institutions.count());
    }

    @Test
    void partialFailureReportsOnlyCommittedPagesAndReleasesLock() {
        failOnPage = 2;
        var failure = assertThrows(SyncFailedException.class, () -> sync.synchronizeInstitutions());
        assertEquals(2, failure.getProgress().institutions().created());
        assertEquals(1, failure.getProgress().institutions().pages());
        assertEquals(2, institutions.count());
        failOnPage = 0;
        assertEquals(2, sync.synchronizeInstitutions().updated());
    }

    @Test
    void inconsistentPaginationDoesNotReportSuccess() {
        malformed = true;
        assertThrows(SyncFailedException.class, () -> sync.synchronizeInstitutions());
        assertEquals(0, institutions.count());
    }

    @Test
    void competingSyncIsRejectedAcrossIndependentDatabaseConnections() {
        var lock = context.getBean(SyncLock.class);
        lock.execute(() -> {
            assertThrows(SyncBusyException.class, () -> sync.synchronizeInstitutions());
            return null;
        });
        assertEquals(2, sync.synchronizeInstitutions().created());
    }

    @Test
    void httpTimeoutIsBounded() {
        delay = true;
        var client = new DataIntegrationClient("http://127.0.0.1:" + source.getAddress().getPort(), 100, 100);
        assertThrows(DataIntegrationException.class, () -> client.getInstitutions(1, 2));
        delay = false;
    }

    @Test
    void maximumPageLimitStopsAFullLastPageWithPartialProgress() {
        var bounded = new DataSynchronizationService(context.getBean(DataIntegrationClient.class),
                persistence, context.getBean(SyncLock.class), 2, 1);
        var failure = assertThrows(SyncFailedException.class, bounded::synchronizeInstitutions);
        assertEquals(2, failure.getProgress().institutions().created());
    }

    @Test
    void httpFullSyncProtectsWritesAndKeepsAllPagesOfPrograms() throws Exception {
        int port = context.getEnvironment().getRequiredProperty("local.server.port", Integer.class);
        var endpoint = URI.create("http://127.0.0.1:" + port + "/api/admin/data-sync");
        try (var http = HttpClient.newHttpClient()) {
            var denied = http.send(HttpRequest.newBuilder(endpoint).POST(HttpRequest.BodyPublishers.noBody())
                    .build(), HttpResponse.BodyHandlers.ofString());
            assertEquals(401, denied.statusCode());
            assertEquals(0, institutions.count());
            var request = HttpRequest.newBuilder(endpoint).header("X-Sync-Token", TEST_TOKEN)
                    .POST(HttpRequest.BodyPublishers.noBody()).build();
            var success = http.send(request, HttpResponse.BodyHandlers.ofString());
            assertEquals(200, success.statusCode(), success.body());
            assertTrue(success.body().contains("\"reviewRequired\":3"), success.body());
            assertEquals(2, institutions.count());
            assertEquals(3, programs.count());
            assertEquals(200, http.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
            assertEquals(3, programs.count());
        }
    }

    @Test
    void fullSyncFailureIncludesCompletedInstitutionsAndCommittedPrograms() {
        failProgramPage = 2;
        var error = assertThrows(SyncFailedException.class, sync::synchronizeAll);
        assertEquals(2, error.getProgress().institutions().created());
        assertEquals(2, error.getProgress().programs().created());
        assertEquals(2, programs.count());
        failProgramPage = 0;
        assertEquals(1, sync.synchronizeAll().programs().created());
        assertEquals(3, programs.count());
    }

    @Test
    void adminEndpointsRequireCredentialBeforeAnyWrite() throws Exception {
        var service = mock(DataSynchronizationService.class);
        when(service.synchronizeInstitutions()).thenReturn(SyncReport.empty("institutions"));
        String token = "a-test-only-token-with-at-least-32-bytes";
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DataSynchronizationController(service))
                .addInterceptors(new SyncAuthorization(token)).build();
        mvc.perform(post("/api/admin/data-sync/institutions")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/data-sync/programs").header("X-Sync-Token", "incorrect"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
        mvc.perform(post("/api/admin/data-sync/institutions").header("X-Sync-Token", token))
                .andExpect(status().isOk());
        verify(service).synchronizeInstitutions();
        MockMvc disabled = MockMvcBuilders.standaloneSetup(new DataSynchronizationController(service))
                .addInterceptors(new SyncAuthorization("")).build();
        disabled.perform(post("/api/admin/data-sync").header("X-Sync-Token", token))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void upgradesLegacySchemaWithoutLosingManualData() {
        var legacy = new PGSimpleDataSource();
        legacy.setURL(postgres.getJdbcUrl("postgres", "postgres"));
        legacy.setCurrentSchema("legacy_test");
        jdbc.execute("CREATE SCHEMA legacy_test");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V1__esquema_inicial.sql")).execute(legacy);
        var oldJdbc = new JdbcTemplate(legacy);
        oldJdbc.update("insert into institucion(nombre, descripcion) values ('Manual', 'Conservar')");
        var flyway = Flyway.configure().dataSource(legacy).schemas("legacy_test")
                .baselineOnMigrate(true).baselineVersion("0").load();
        flyway.migrate();
        assertEquals("Conservar", oldJdbc.queryForObject("select descripcion from institucion", String.class));
        assertEquals(1, oldJdbc.queryForObject("select count(*) from institucion", Integer.class));
        assertEquals(0, flyway.migrate().migrationsExecuted);
    }
}
