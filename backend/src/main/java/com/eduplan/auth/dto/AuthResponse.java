package com.eduplan.auth.dto;

public record AuthResponse(
    String token,
    String tokenType,
    long expiresIn,
    Long userId,
    String email,
    String phone
){}
