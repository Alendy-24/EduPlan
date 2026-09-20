package com.eduplan.services;

import com.eduplan.entities.Interes;
import com.eduplan.repositories.InteresRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class InteresServiceImpl implements InteresService {

    @Autowired
    private InteresRepository interesRepository;

    @Override
    public Collection<Interes> findAll() {
        return interesRepository.findAll();
    }

    @Override
    public Interes findById(Long id) {
        return interesRepository.findById(id).orElse(null);
    }

    @Override
    public Interes guardar(Interes interes) {
        return interesRepository.save(interes);
    }

    @Override
    public void deleteById(Long id) {
        interesRepository.deleteById(id);
    }
}
