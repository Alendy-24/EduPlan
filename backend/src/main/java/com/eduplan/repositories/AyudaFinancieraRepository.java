package com.eduplan.repositories;
import com.eduplan.entities.AyudaFinanciera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AyudaFinancieraRepository extends JpaRepository<AyudaFinanciera,Long> {

}
