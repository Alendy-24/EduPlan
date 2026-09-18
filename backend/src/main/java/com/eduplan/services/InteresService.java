package com.eduplan.services;

import com.eduplan.entities.Interes;

import java.util.Collection;

public interface InteresService {
    Collection<Interes> findAll();
    Interes findById(Long id);
    Interes guardar(Interes interes);
    void deleteById(Long id);
}
