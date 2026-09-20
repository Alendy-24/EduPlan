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

    @Column(name = "codigo_fuente", length = 30)
    private String codigoFuente;

    @Column(name = "clave_fuente", length = 128, unique = true)
    private String claveFuente;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String nombre;

    @Column(name = "nombre_original", columnDefinition = "TEXT")
    private String nombreOriginal;

    @Column(name = "titulo_otorgado", columnDefinition = "TEXT")
    private String tituloOtorgado;

    @Column(name = "area_conocimiento", columnDefinition = "TEXT")
    private String areaConocimiento;

    @Column(name = "origen_nombre", length = 30)
    private String origenNombre;

    @Column(name = "requiere_revision", nullable = false)
    private boolean requiereRevision;

    @Column(length = 100)
    private String modalidad;

    @Column(length = 100)
    private String municipio;

    @Column(length = 100)
    private String departamento;

    @Column(length = 100)
    private String estado;

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

    @Column(name = "nivel_academico", length = 100)
    private String nivelAcademico;

    @Column(length = 100)
    private String periodicidad;

    @ManyToOne
    @JoinColumn(name = "id_institucion", referencedColumnName = "id_institucion")
    private Institucion institucion;
}
