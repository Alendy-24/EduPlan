package com.eduplan.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "institucion")
public class Institucion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_institucion")
    private Long idInstitucion;

    @Column(name = "codigo_fuente", length = 30, unique = true)
    private String codigoFuente;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String nombre;

    @Column(length = 100)
    private String tipo;

    @Column(name = "caracter_academico", length = 100)
    private String caracterAcademico;

    @Column(length = 100)
    private String ciudad;

    @Column(length = 100)
    private String departamento;

    @Column(columnDefinition = "TEXT")
    private String direccion;

    @Column(length = 100)
    private String telefono;

    @Column(length = 100)
    private String estado;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "sitio_web", length = 255)
    private String sitioWeb;
}
