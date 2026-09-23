package com.eduplan.services;

import com.eduplan.entities.ResultadoTest;
import com.eduplan.repositories.ResultadoTestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collection;

@Service
public class ResultadoTestServiceImpl implements ResultadoTestService{

    @Autowired
    private ResultadoTestRepository resultadotestRepository;

    @Override public Collection<ResultadoTest> findAll() {
        return resultadotestRepository.findAll();
    }

    @Override public ResultadoTest findById(Long id) {
        return resultadotestRepository.findById(id).orElse(null);
    }

    @Override public ResultadoTest guardar(ResultadoTest t) {
        return resultadotestRepository.save(t);
    }

    @Override public void deleteById(Long id) {
        resultadotestRepository.deleteById(id);
    }

}
