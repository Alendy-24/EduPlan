package com.eduplan.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
  @NotBlank(message = "El identificador es obligatorio")
  String identifier, 
  // puede ser un correo o un telefono

  @NotBlank(message = "La contraseña es obligatoria")
  String password
) {
}

