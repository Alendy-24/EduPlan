package com.eduplan.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "ayuda_financiera")
public class AyudaFinanciera {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ayuda")
    private Long idAyuda;

    @Column(length = 100, nullable = false)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(precision = 10, scale = 2)
    private BigDecimal porcentaje;

    @Column(columnDefinition = "TEXT")
    private String requisitos;

    @Column(nullable = false)
    private LocalDateTime fecha_inicio;

    @Column(nullable = false)
    private LocalDateTime fecha_limite;

    @Column(columnDefinition = "TEXT")
    private String enlace;

    @Column(length = 100)
    private String tipo_financiacion;

    @ManyToOne
    @JoinColumn(name = "id_entidad", referencedColumnName = "id_entidad")
    private EntidadFinanciera entidadFinanciera;

    // Relación 2: La institución educativa donde aplica la ayuda
    @ManyToOne
    @JoinColumn(name = "id_institucion", referencedColumnName = "id_institucion")
    private Institucion institucion;
}
