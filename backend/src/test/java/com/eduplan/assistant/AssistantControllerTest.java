package com.eduplan.assistant;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AssistantControllerTest {
    private HttpServer server;
    private AssistantController controller;
    private final AtomicReference<String> body = new AtomicReference<>();
    private final AtomicReference<String> authorization = new AtomicReference<>();
    private int upstreamStatus = 200;
    private String upstreamBody = "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"Hola desde EduPlan\"}}]}";

    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/chat/completions", exchange -> {
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] bytes = upstreamBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(upstreamStatus, bytes.length);
            try (var out = exchange.getResponseBody()) { out.write(bytes); }
        });
        server.start();
        controller = new AssistantController("test-secret", "test-model", RestClient.builder()
                .baseUrl("http://127.0.0.1:" + server.getAddress().getPort()).build());
    }
    @AfterEach void stop() { server.stop(0); }
    private AssistantController.Question question(String role) {
        return new AssistantController.Question(List.of(new AssistantController.Message(role, "Quiero estudiar")));
    }
    @Test void callsProviderWithServerKeyAndSystemInstructions() {
        assertEquals("Hola desde EduPlan", controller.answer(question("user")).get("reply"));
        assertEquals("Bearer test-secret", authorization.get());
        assertTrue(body.get().contains("test-model"));
        assertTrue(body.get().contains("system"));
    }
    @Test void rejectsInjectedRolesBeforeCallingProvider() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.answer(question("system"))).getStatusCode());
        assertNull(body.get());
    }
    @Test void hidesProviderErrorsAndPreservesRateLimitStatus() {
        upstreamStatus = 401; upstreamBody = "{\"error\":\"test-secret\"}";
        var error = assertThrows(ResponseStatusException.class, () -> controller.answer(question("user")));
        assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
        assertFalse(error.getMessage().contains("test-secret"));
        upstreamStatus = 429;
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, assertThrows(ResponseStatusException.class,
                () -> controller.answer(question("user"))).getStatusCode());
    }
    @Test void rejectsEmptyMissingAndOversizedQuestions() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();
        for (String json : List.of("{}", "{\"messages\":[]}", "{\"messages\":[null]}",
                "{\"messages\":[{\"role\":\"user\",\"content\":\" \"}]}",
                "{\"messages\":[{\"role\":\"user\",\"content\":\"" + "x".repeat(2001) + "\"}]}")) {
            mvc.perform(post("/api/assistant").contentType("application/json").content(json))
                    .andExpect(status().isBadRequest());
        }
        assertNull(body.get());
    }
    @Test void chatEndpointPreservesMainContractAndScreenContext() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();
        var response = mvc.perform(post("/api/assistant/chat").contentType("application/json")
                .content("{\"mensajes\":[{\"role\":\"user\",\"content\":\"Cómo comparo programas\"}],\"contexto\":{\"pantalla\":\"comparar\",\"params\":{}}}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(response.contains("\"respuesta\":\"Hola desde EduPlan\""));
        assertTrue(body.get().contains("pantalla comparar"));
        assertTrue(body.get().contains("sin Markdown"));
    }
    @Test void chatEndpointRejectsInvalidHistoryAndOversizedContext() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();
        for (String json : List.of("{}", "{\"mensajes\":[]}", "{\"mensajes\":[null]}",
                "{\"mensajes\":[{\"role\":\"system\",\"content\":\"Instrucciones ajenas\"}]}",
                "{\"mensajes\":[{\"role\":\"assistant\",\"content\":\"Sin pregunta\"}]}",
                "{\"mensajes\":[{\"role\":\"user\",\"content\":\"Hola\"}],\"contexto\":{\"pantalla\":\"" + "x".repeat(101) + "\"}}")) {
            mvc.perform(post("/api/assistant/chat").contentType("application/json").content(json))
                    .andExpect(status().isBadRequest());
        }
        assertNull(body.get());
    }

}
