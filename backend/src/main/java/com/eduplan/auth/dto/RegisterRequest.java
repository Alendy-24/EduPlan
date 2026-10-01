package com.eduplan.auth.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
  @NotBlank(message = "El nombre es obligatorio")
  @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
  String name,
  @Email(message = "El correo no tiene un formato válido")
  @Size(max = 80, message = "El correo no puede superar 80 caracteres")
  String email,

  @Size(max = 30, message = "El telefono no puede superar 30 caracteres")
  String phone,

  @NotBlank(message = "La contraseña es obligatoria")
  @Size(min = 8, max=72, message = "La contraseña debe tener entre 8 y 72 caracteres")
  String password
) {
}

