package com.eduplan.services;

import com.eduplan.entities.Cuenta;

import java.util.Collection;

public interface CuentaService {
    Collection<Cuenta> findAll();
    Cuenta findById(Long id);
    Cuenta guardar(Cuenta cuenta);
    void deleteById(Long id);

}
