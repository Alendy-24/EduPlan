package com.eduplan.repositories;

import com.eduplan.entities.Cuenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CuentaRepository extends JpaRepository<Cuenta, Long> {

    @Query("""
        select c
        from Cuenta c
        where lower(c.correo) = lower(:correo)
    """)
    Optional<Cuenta> findByCorreoIgnoreCase(
            @Param("correo") String correo
    );

    Optional<Cuenta> findByTelefono(String telefono);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Cuenta c where c.idCuenta = :id")
    Optional<Cuenta> findForUpdate(@Param("id") Long id);

    @Query("""
        select case when count(c) > 0 then true else false end
        from Cuenta c
        where lower(c.correo) = lower(:correo)
    """)
    boolean existsByCorreoIgnoreCase(
            @Param("correo") String correo
    );

    boolean existsByTelefono(String telefono);
}

