package com.eduplan.repositories;

import com.eduplan.entities.Cuenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface CuentaRepository extends JpaRepository<Cuenta,Long> {
  Optional<Cuenta> findByCorreoIgnoreCase(String correo);
  Optional<Cuenta> findByTelefono(String correo);
  boolean existsByCorreoIgnoreCase(String correo);
  boolean existsByTelefono(String correo);
}
