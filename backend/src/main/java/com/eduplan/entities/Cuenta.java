package com.eduplan.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "cuenta")
public class Cuenta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cuenta")
    private Long id_cuenta;

    @Column(length = 80, nullable = false)
    private String correo;

    @Column(length = 80, nullable = false)
    private String contrasena;

    @Column(nullable = false)
    private boolean estado;

    @Column(nullable = false)
    private LocalDateTime fecha_registro;

    @OneToOne(mappedBy = "cuenta", cascade = CascadeType.ALL)
    private Estudiante estudiante;
}
