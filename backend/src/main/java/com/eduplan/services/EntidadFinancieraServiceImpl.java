package com.eduplan.services;

import com.eduplan.entities.EntidadFinanciera;
import com.eduplan.repositories.EntidadFinancieraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class EntidadFinancieraServiceImpl implements EntidadFinancieraService {

    @Autowired
    private EntidadFinancieraRepository entidadFinancieraRepository;

    @Override
    public Collection<EntidadFinanciera> findAll() {
        return entidadFinancieraRepository.findAll();
    }

    @Override
    public EntidadFinanciera findById(Long id) {
        return entidadFinancieraRepository.findById(id).orElse(null);
    }

    @Override
    public EntidadFinanciera guardar(EntidadFinanciera entidadFinanciera) {
        return entidadFinancieraRepository.save(entidadFinanciera);
    }

    @Override
    public void deleteById(Long id) {
        entidadFinancieraRepository.deleteById(id);
    }
}
