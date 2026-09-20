package com.eduplan.services;

import com.eduplan.entities.ResultadoTest;

import java.util.Collection;

public interface ResultadoTestService {
    Collection<ResultadoTest> findAll();
    ResultadoTest findById(Long id);
    ResultadoTest guardar(ResultadoTest resultadoTest);
    void deleteById(Long id);
}
