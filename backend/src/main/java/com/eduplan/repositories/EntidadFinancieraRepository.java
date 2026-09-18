package com.eduplan.repositories;
import com.eduplan.entities.EntidadFinanciera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EntidadFinancieraRepository extends JpaRepository<EntidadFinanciera,Long> {

}
