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

    @PostMapping("/chat")
    public RespuestaChat chat(@RequestBody PeticionChat peticion) {
        // Manual fijo + pantalla donde está el usuario (los datos recuperados vendrán después)
        String sistema = manual.texto()
                + "\n\nEl usuario está en la pantalla: " + peticion.contexto().pantalla();
        return new RespuestaChat(servicio.responder(sistema, peticion.mensajes()));
    }
}