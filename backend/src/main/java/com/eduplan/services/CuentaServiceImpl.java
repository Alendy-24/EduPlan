package com.eduplan.services;

import com.eduplan.entities.Cuenta;
import com.eduplan.repositories.CuentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collection;

@Service
public class CuentaServiceImpl implements CuentaService {

    @Autowired
    CuentaRepository cuentaRepository;

    @Override
    public Collection<Cuenta> findAll() {
        return cuentaRepository.findAll();
    }

    @Override
    public Cuenta findById(Long id) {
        return cuentaRepository.findById(id).orElse(null);
    }

    @Override
    public Cuenta guardar(Cuenta cuenta) {
        return cuentaRepository.save(cuenta);
    }

    @Override
    public void deleteById(Long id) {
        cuentaRepository.deleteById(id);
    }
}
