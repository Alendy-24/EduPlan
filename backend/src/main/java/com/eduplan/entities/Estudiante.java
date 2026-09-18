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
@Table(name = "estudiante")
public class Estudiante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estudiante")
    private Long id_estudiante;

    @Column(length = 100, nullable = false)
    private String nombre;

    @Column(length = 100, nullable = false)
    private String apellido;

    @Column(length = 100, nullable = false)
    private String grado;

    @Column(length = 100, nullable = false)
    private String departamento;

    @Column(length = 100, nullable = false)
    private String municipio;

    @Column(precision = 10, scale = 2)
    private BigDecimal presupuesto;

    @Column(name = "modalidad_preferida", length = 100)
    private String modalidadPreferida;

    @OneToOne
    @JoinColumn(name = "id_cuenta", referencedColumnName = "id_cuenta")
    private Cuenta cuenta;
}
