package com.eduplan.services;

import com.eduplan.entities.Respuesta;

import java.util.Collection;

public interface RespuestaService {
    Collection<Respuesta> findAll();
    Respuesta findById(Long id);
    Respuesta guardar(Respuesta respuesta);
    void deleteById(Long id);
}
