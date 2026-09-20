package com.eduplan.integration.dto;

import java.util.List;

public record IntegrationPage<T>(List<T> data, int page, int limit, int returned) {
    public IntegrationPage {
        if (data == null) {
            throw new IllegalArgumentException("La respuesta no contiene data");
        }
        data = List.copyOf(data);
    }
}
