package com.eduplan.services;

import com.eduplan.entities.Institucion;
import com.eduplan.repositories.InstitucionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class InstitucionServiceImpl implements InstitucionService {

    @Autowired
    private InstitucionRepository institucionRepository;

    @Override
    public Collection<Institucion> findAll(){
        return institucionRepository.findAll();
    }

    @Override
    public Institucion findById(Long id){
        return institucionRepository.findById(id).orElse(null);
    }

    @Override
    public Institucion guardar(Institucion institucion){
        return institucionRepository.save(institucion);
    }

    @Override
    public void deleteById(Long id){
        institucionRepository.deleteById(id);
    }
}
