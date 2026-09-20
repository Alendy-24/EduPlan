package com.eduplan.integration.dto;

public record InstitutionPayload(
        String code,
        String name,
        String sector,
        String academicCharacter,
        String department,
        String municipality,
        String address,
        String phone,
        String status,
        String website
) {
}
