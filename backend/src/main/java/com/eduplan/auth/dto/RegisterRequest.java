package com.eduplan.auth.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
  @Email(message = "El correo no tiene un formato válido")
  String email,

  @Size(max = 30, message = "El telefono no puede superar 30 caracteres")
  String phone,

  @Size(min = 8, max=72, message = "La contraseña debe tener entre 8 y 72 caracteres")
  String password
) {
}

