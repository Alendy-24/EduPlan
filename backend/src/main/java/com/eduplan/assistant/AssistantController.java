package com.eduplan.assistant;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    // Lo que envía el frontend: historial de mensajes + contexto de pantalla
    public record PeticionChat(List<AssistantService.Mensaje> mensajes, Contexto contexto) {}
    public record Contexto(String pantalla, Map<String, String> params) {}
    public record RespuestaChat(String respuesta) {}

    private final AssistantService servicio;
    private final ManualAsistente manual;

    public AssistantController(AssistantService servicio, ManualAsistente manual) {
        this.servicio = servicio;
        this.manual = manual;
    }

    private static final String REGLAS_FORMATO = """

        REGLAS DE RESPUESTA (obligatorias):
        - Responde en español, en texto plano. NO uses Markdown: nada de tablas, asteriscos, almohadillas (#) ni bloques de código.
        - Máximo 4 o 5 frases. Si hay pasos, escríbelos en líneas separadas numeradas así: "1. ...", "2. ...".
        - Para enumerar opciones usa líneas que empiecen con "- ".
        - Menciona los botones y pantallas entre comillas, por ejemplo: pulsa "Comparar".
        - Si el usuario pide una tabla, responde con una lista corta en su lugar.
        - Si no encuentras el dato en el manual, dilo y sugiere la pantalla o la fuente oficial.
        """;

    @PostMapping("/chat")
    public RespuestaChat chat(@RequestBody PeticionChat peticion) {
        String sistema = manual.texto()
                + "\n\nEl usuario está en la pantalla: " + peticion.contexto().pantalla()
                + REGLAS_FORMATO;
        return new RespuestaChat(servicio.responder(sistema, peticion.mensajes()));
    }

}