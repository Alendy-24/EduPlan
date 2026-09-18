package com.eduplan.services;

import com.eduplan.entities.Test;

import java.util.Collection;

public interface TestService {

    Collection<Test> findAll();
    Test findById(Long id);
    Test guardar(Test test);
    void deleteById(Long id);
}
