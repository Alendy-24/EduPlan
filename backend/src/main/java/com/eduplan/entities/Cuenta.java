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
  private Long idCuenta;

  @Column(name = "correo", length = 120)
  private String correo;

// Para ingresar con telefono, opcional
  @Column(name = "telefono", length = 30)
  private String telefono;

  @Column(name = "contrasena", nullable = false, length = 255)
  private String contrasena;

  @Column(name = "estado", nullable = false)
  private boolean estado;

  @Column(name = "fecha_registro", nullable = false, updatable = false)
  private LocalDateTime fechaRegistro;

  @OneToOne(mappedBy = "cuenta", cascade = CascadeType.ALL)
  private Estudiante estudiante;

  @PrePersist
  protected void onCreate(){
    if(fechaRegistro == null) {
      fechaRegistro = LocalDateTime.now();
    }
  }
}
