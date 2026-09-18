package com.eduplan.services;

import com.eduplan.entities.Respuesta;
import com.eduplan.repositories.RespuestaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class RespuestaServiceImpl implements RespuestaService {

    @Autowired
    private RespuestaRepository respuestaRepository;

    @Override
    public Collection<Respuesta> findAll() {
        return respuestaRepository.findAll();
    }

    @Override
    public Respuesta findById(Long id) {
        return respuestaRepository.findById(id).orElse(null);
    }

    @Override
    public Respuesta guardar(Respuesta respuesta) {
        return respuestaRepository.save(respuesta);
    }

    @Override
    public void deleteById(Long id) {
        respuestaRepository.deleteById(id);
    }
}
