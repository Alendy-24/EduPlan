package com.eduplan.repositories;

import com.eduplan.entities.Institucion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface InstitucionRepository extends JpaRepository<Institucion,Long> {
    List<Institucion> findAllByCodigoFuenteIn(Collection<String> codigos);
}
