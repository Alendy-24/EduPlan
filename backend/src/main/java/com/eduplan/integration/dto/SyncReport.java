package com.eduplan.integration.dto;

import java.util.Map;
import java.util.HashMap;

public record SyncReport(String dataset, int pages, int created, int updated, int skipped,
                         int reviewRequired, Map<String, Integer> skippedReasons) {
    public SyncReport {
        skippedReasons = Map.copyOf(skippedReasons);
    }

    public SyncReport plus(SyncReport other) {
        if (!dataset.equals(other.dataset)) {
            throw new IllegalArgumentException("No se pueden combinar reportes de datasets diferentes");
        }
        Map<String, Integer> reasons = new HashMap<>(skippedReasons);
        other.skippedReasons.forEach((key, value) -> reasons.merge(key, value, Integer::sum));
        return new SyncReport(
                dataset,
                pages + other.pages,
                created + other.created,
                updated + other.updated,
                skipped + other.skipped,
                reviewRequired + other.reviewRequired,
                reasons
        );
    }

    public static SyncReport empty(String dataset) {
        return new SyncReport(dataset, 0, 0, 0, 0, 0, Map.of());
    }
}
