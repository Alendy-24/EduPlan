package com.eduplan.services;

import com.eduplan.entities.ProgramaAcademico;
import com.eduplan.repositories.ProgramaAcademicoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class ProgramaAcademicoServiceImpl implements ProgramaAcademicoService {

    @Autowired
    private ProgramaAcademicoRepository repo;

    @Override
    public Collection<ProgramaAcademico> findAll(){
        return repo.findAll();
    }

    @Override
    public ProgramaAcademico findById(Long id){
        return repo.findById(id).orElse(null);
    }

    @Override
    public ProgramaAcademico guardar(ProgramaAcademico p){
        return repo.save(p);
    }

    @Override
    public void deleteById(Long id){
        repo.deleteById(id);
    }
}
