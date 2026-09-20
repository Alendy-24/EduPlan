package com.eduplan.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pregunta")
public class Pregunta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pregunta")
    private Long idPregunta;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String texto;

    @Column(length = 255)
    private String categoria;

    @ManyToOne
    @JoinColumn(name = "id_test", referencedColumnName = "id_test")
    private Test test;
}
