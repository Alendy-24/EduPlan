package com.eduplan.services;

import com.eduplan.entities.AyudaFinanciera;
import com.eduplan.repositories.AyudaFinancieraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class AyudaFinancieraServiceImpl implements AyudaFinancieraService {

    @Autowired
    private AyudaFinancieraRepository ayudaFinancieraRepository;

    @Override
    public Collection<AyudaFinanciera> findAll() {
        return ayudaFinancieraRepository.findAll();
    }

    @Override
    public AyudaFinanciera findById(Long id) {
        return ayudaFinancieraRepository.findById(id).orElse(null);
    }

    @Override
    public AyudaFinanciera guardar(AyudaFinanciera ayudaFinanciera) {
        return ayudaFinancieraRepository.save(ayudaFinanciera);
    }

    @Override
    public void deleteById(Long id) {
        ayudaFinancieraRepository.deleteById(id);
    }
}
