package com.eduplan.repositories;

import com.eduplan.entities.ProgramaAcademico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ProgramaAcademicoRepository extends JpaRepository<ProgramaAcademico,Long> {
    List<ProgramaAcademico> findAllByClaveFuenteIn(Collection<String> claves);
}
