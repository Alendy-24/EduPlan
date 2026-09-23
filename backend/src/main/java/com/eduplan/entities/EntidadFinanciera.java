package com.eduplan.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "entidad_financiera")
public class EntidadFinanciera {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_entidad")
    private Long idEntidad;

    @Column(length = 100, nullable = false)
    private String nombre;

    @Column(length = 100)
    private String tipo;

    @Column(name = "sitio_web", length = 255)
    private String sitioWeb;
}
