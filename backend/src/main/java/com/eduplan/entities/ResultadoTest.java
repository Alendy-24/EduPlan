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
@Table(name = "resultado_test")
public class ResultadoTest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_resultado")
    private Long idResultado;

    @Column(name = "porcentaje_match", precision = 10, scale = 2, nullable = false)
    private BigDecimal porcentajeMatch;

    @ManyToOne
    @JoinColumn(name = "id_test", referencedColumnName = "id_test")
    private Test test;

    @ManyToOne
    @JoinColumn(name = "id_programa", referencedColumnName = "id_programa")
    private ProgramaAcademico programaAcademico;
}
