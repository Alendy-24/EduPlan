package com.eduplan.assistant;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class AssistantService {

    // Mensaje del chat (rol: "system", "user" o "assistant")
    public record Mensaje(String role, String content) {}

    private record Respuesta(List<Opcion> choices) {
        record Opcion(Mensaje message) {}
    }

    private final RestClient cliente;
    private final String modelo;


    public AssistantService(@Value("${assistant.base-url}") String baseUrl,
                            @Value("${assistant.api-key}") String apiKey,
                            @Value("${assistant.model}") String modelo) {
        this.modelo = modelo;
        this.cliente = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public String responder(String promptSistema, List<Mensaje> historial) {
        // Primero el contexto del sistema, luego solo los últimos mensajes
        List<Mensaje> mensajes = new ArrayList<>();
        mensajes.add(new Mensaje("system", promptSistema));
        int desde = Math.max(0, historial.size() - 10);
        mensajes.addAll(historial.subList(desde, historial.size()));

        Map<String, Object> cuerpo = Map.of(
                "model", modelo,
                "messages", mensajes,
                "temperature", 0.3,          // baja: respuestas más estables
                "max_tokens", 1500,          
                "reasoning_effort", "low"    // razona poco
        );

        Respuesta respuesta = cliente.post()
                .uri("/chat/completions")
                .body(cuerpo)
                .retrieve()
                .body(Respuesta.class);

        if (respuesta == null || respuesta.choices() == null || respuesta.choices().isEmpty()) {
            return "No pude generar una respuesta en este momento.";
        }
        return respuesta.choices().get(0).message().content();
    }
}