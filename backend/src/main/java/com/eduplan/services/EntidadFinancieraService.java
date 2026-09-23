package com.eduplan.services;

import com.eduplan.entities.EntidadFinanciera;

import java.util.Collection;

public interface EntidadFinancieraService {
    Collection<EntidadFinanciera> findAll();
    EntidadFinanciera findById(Long id);
    EntidadFinanciera guardar(EntidadFinanciera entidadFinanciera);
    void deleteById(Long id);
}
