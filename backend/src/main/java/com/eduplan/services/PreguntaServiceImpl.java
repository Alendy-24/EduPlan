package com.eduplan.services;
import com.eduplan.entities.Pregunta;
import com.eduplan.repositories.PreguntaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class PreguntaServiceImpl implements PreguntaService {
    @Autowired private PreguntaRepository preguntaRepository;

    @Override public Collection<Pregunta> findAll() {
        return preguntaRepository.findAll();
    }

    @Override public Pregunta findById(Long id) {
        return preguntaRepository.findById(id).orElse(null);
    }

    @Override public Pregunta guardar(Pregunta t) {
        return preguntaRepository.save(t);
    }

    @Override public void deleteById(Long id) {
        preguntaRepository.deleteById(id);
    }
}
