package com.eduplan.assistant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
    private final String key;
    private final String model;
    private final RestClient client;
    private String manualText = "";

    @Autowired
    public AssistantController(@Value("${GROQ_API_KEY:}") String key,
                               @Value("${assistant.model:openai/gpt-oss-20b}") String model,
                               @Value("${assistant.base-url:https://api.groq.com/openai/v1}") String baseUrl,
                               ManualAsistente manual) {
        this(key, model, groqClient(baseUrl));
        this.manualText = manual.texto();
    }

    AssistantController(String key, String model, RestClient client) {
        this.key = key;
        this.model = model;
        this.client = client;
    }

    private static RestClient groqClient(String baseUrl) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(30000);
        return RestClient.builder().baseUrl(baseUrl)
                .requestFactory(factory).build();
    }

    public record Message(@NotBlank String role, @NotBlank @Size(max = 2000) String content) {}
    public record Question(@Size(min = 1, max = 12) @jakarta.validation.constraints.NotNull
                           List<@jakarta.validation.constraints.NotNull @Valid Message> messages) {}
    public record Completion(List<Choice> choices) {}
    public record Choice(Message message) {}

    public record Contexto(@Size(max = 100) String pantalla, Map<String, String> params) {}
    public record PeticionChat(@jakarta.validation.constraints.NotNull @Size(min = 1, max = 12)
                               List<@jakarta.validation.constraints.NotNull @Valid Message> mensajes,
                               @Valid Contexto contexto) {}
    public record RespuestaChat(String respuesta) {}

    @PostMapping("/chat")
    public RespuestaChat chat(@Valid @RequestBody PeticionChat peticion) {
        String pantalla = peticion.contexto() == null ? "desconocida" : peticion.contexto().pantalla();
        return new RespuestaChat(complete(new Question(peticion.mensajes()), pantalla).get("reply"));
    }

    @PostMapping
    public Map<String, String> answer(@Valid @RequestBody Question question) {
        return complete(question, "desconocida");
    }

    private Map<String, String> complete(Question question, String pantalla) {
        if (key.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "El asistente no está configurado.");
        var messages = new ArrayList<Map<String, String>>();
        messages.add(Map.of("role", "system", "content", manualText + "\n\n" + """
                Eres el asistente de EduPlan. Responde en español, de forma breve y clara.
                Ayuda a explorar estudios superiores en Colombia y a usar el catálogo,
                los filtros, favoritos, el comparador y el perfil académico de EduPlan.
                No tienes acceso en tiempo real al catálogo, a la cuenta ni a fuentes externas.
                No inventes programas, costos, becas, fechas, acreditaciones ni enlaces.
                Para datos específicos, orienta a consultar el catálogo y la web oficial de la institución.
                Haz preguntas sobre intereses, ubicación y modalidad para orientar sin decidir por la persona.
                Responde en texto plano, sin Markdown ni tablas, en un máximo de 5 frases.
                Si hay pasos, usa líneas numeradas. Menciona los botones y pantallas entre comillas.
                """));
        // Screen context stays separate from the system rules and is bounded by validation.
        messages.add(Map.of("role", "user", "content", "Contexto de navegación: pantalla " + pantalla));
        for (var message : question.messages()) {
            if (!message.role().equals("user") && !message.role().equals("assistant"))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol de mensaje inválido.");
            messages.add(Map.of("role", message.role(), "content", message.content()));
        }
        if (!question.messages().getLast().role().equals("user"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escribe una pregunta.");
        try {
            var result = client.post().uri("/chat/completions")
                    .header("Authorization", "Bearer " + key)
                    .body(Map.of("model", model, "messages", messages, "max_completion_tokens", 700))
                    .retrieve().body(Completion.class);
            if (result == null || result.choices() == null || result.choices().isEmpty()
                    || result.choices().getFirst().message() == null
                    || result.choices().getFirst().message().content() == null
                    || result.choices().getFirst().message().content().isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "El asistente no devolvió una respuesta.");
            return Map.of("reply", result.choices().getFirst().message().content());
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 429)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "El asistente está ocupado. Intenta en un momento.");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo consultar el asistente.");
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El asistente no está disponible. Intenta de nuevo.");
        }
    }
}
