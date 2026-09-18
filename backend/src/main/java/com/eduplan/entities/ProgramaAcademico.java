package com.eduplan.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "programa_academico")
public class ProgramaAcademico {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_programa")
    private Long idPrograma;

    @Column(length = 100, nullable = false)
    private String nombre;

    @Column(length = 100)
    private String modalidad;

    @Column(length = 100)
    private String duracion;

    @Column(precision = 10, scale = 2)
    private BigDecimal costo;

    @Column(length = 100)
    private String requisitos;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "nivel_formacion", length = 100)
    private String nivelFormacion;

    @ManyToOne
    @JoinColumn(name = "id_institucion", referencedColumnName = "id_institucion")
    private Institucion institucion;
}
