package com.eduplan.assistant;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
public class ManualAsistente {

    private final String texto;

    // Lee assistant/manual.md
    public ManualAsistente(@Value("classpath:assistant/manual.md") Resource recurso) throws IOException {
        this.texto = recurso.getContentAsString(StandardCharsets.UTF_8);
    }

    public String texto() {
        return texto;
    }
}