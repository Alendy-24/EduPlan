package com.eduplan.services;

import com.eduplan.entities.Postulacion;
import com.eduplan.repositories.PostulacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class PostulacionServiceImpl implements PostulacionService {

    @Autowired
    private PostulacionRepository postulacionRepository;

    @Override
    public Collection<Postulacion> findAll() {
        return postulacionRepository.findAll();
    }

    @Override
    public Postulacion findById(Long id) {
        return postulacionRepository.findById(id).orElse(null);
    }

    @Override
    public Postulacion guardar(Postulacion postulacion) {
        return postulacionRepository.save(postulacion);
    }

    @Override
    public void deleteById(Long id) {
        postulacionRepository.deleteById(id);
    }
}
