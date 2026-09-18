package com.eduplan.services;

import com.eduplan.entities.Pregunta;

import java.util.Collection;

public interface PreguntaService {
    Collection<Pregunta> findAll();
    Pregunta findById(Long id);
    Pregunta guardar(Pregunta pregunta);
    void deleteById(Long id);
}
