package com.eduplan.services;

import com.eduplan.entities.Postulacion;

import java.util.Collection;

public interface PostulacionService {
    Collection<Postulacion> findAll();
    Postulacion findById(Long id);
    Postulacion guardar(Postulacion postulacion);
    void deleteById(Long id);
}
