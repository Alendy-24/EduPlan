package com.eduplan.services;

import com.eduplan.entities.AyudaFinanciera;

import java.util.Collection;

public interface AyudaFinancieraService {
    Collection<AyudaFinanciera> findAll();
    AyudaFinanciera findById(Long id);
    AyudaFinanciera guardar(AyudaFinanciera ayudaFinanciera);
    void deleteById(Long id);
}
