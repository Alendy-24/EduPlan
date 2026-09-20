package com.eduplan.integration.dto;

public record ProgramPayload(
        String sourceId,
        String rawName,
        String awardedTitle,
        String knowledgeArea,
        String nameOrigin,
        boolean reviewRequired,
        String code,
        String institutionCode,
        String institutionName,
        String name,
        String academicLevel,
        String educationLevel,
        String modality,
        String periodCount,
        String periodicity,
        String department,
        String municipality,
        String status
) {
}
