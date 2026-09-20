package com.eduplan.services;

import com.eduplan.entities.Institucion;

import java.util.Collection;

public interface InstitucionService {
    Collection<Institucion> findAll();
    Institucion findById(Long id);
    Institucion guardar(Institucion institucion);
    void deleteById(Long id);
}
