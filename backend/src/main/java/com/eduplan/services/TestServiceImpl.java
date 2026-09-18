package com.eduplan.services;
import com.eduplan.entities.Test;
import com.eduplan.repositories.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collection;

@Service
public class TestServiceImpl implements TestService {
    @Autowired
    private TestRepository testRepository;

    @Override public Collection<Test> findAll() {
        return testRepository.findAll();
    }

    @Override public Test findById(Long id) {
        return testRepository.findById(id).orElse(null);
    }

    @Override public Test guardar(Test t) {
        return testRepository.save(t);
    }

    @Override public void deleteById(Long id) {
        testRepository.deleteById(id);
    }
}
