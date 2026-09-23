package com.eduplan.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "respuesta")
public class Respuesta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_respuesta")
    private Long idRespuesta;

    @Column(length = 100, nullable = false)
    private String respuesta;

    @ManyToOne
    @JoinColumn(name = "id_pregunta", referencedColumnName = "id_pregunta")
    private Pregunta pregunta;
}
