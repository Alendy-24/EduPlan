package com.eduplan.services;

import com.eduplan.entities.ProgramaAcademico;

import java.util.Collection;

public interface ProgramaAcademicoService {
    Collection<ProgramaAcademico> findAll();
    ProgramaAcademico findById(Long id);
    ProgramaAcademico guardar(ProgramaAcademico programa);
    void deleteById(Long id);
}
