package com.eduplan.services;

import com.eduplan.entities.Estudiante;

import java.util.Collection;

public interface EstudianteService {
    Collection<Estudiante> findAll();
    Estudiante findById(Long id);
    Estudiante guardar(Estudiante estudiante);
    void deleteById(Long id);
}
