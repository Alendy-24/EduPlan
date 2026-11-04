package com.eduplan.account;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

/** Optional funding preferences within the account; these do not certify scholarship eligibility. */
public record FinancingPreferences(String studentStage, String support, String repayment,
                                   String international, String admission, String nationality) {
    private static final Map<String, Set<String>> OPTIONS = Map.of(
            "studentStage", Set.of("", "entry", "enrolled"),
            "support", Set.of("", "tuition", "living", "mobility"),
            "repayment", Set.of("", "no", "accepted"),
            "international", Set.of("", "yes", "no"),
            "admission", Set.of("", "yes", "no"),
            "nationality", Set.of("", "Colombianos", "Extranjeros"));

    public static FinancingPreferences empty() {
        return new FinancingPreferences("", "", "", "", "", "");
    }

    /** PUT replaces all six options; reject coercions and unknown fields instead of silently dropping them. */
    public static FinancingPreferences from(Map<String, Object> request) {
        if (request == null || !request.keySet().equals(OPTIONS.keySet())) throw invalid();
        for (var entry : OPTIONS.entrySet()) {
            if (!(request.get(entry.getKey()) instanceof String value) || !entry.getValue().contains(value)) throw invalid();
        }
        return new FinancingPreferences((String) request.get("studentStage"), (String) request.get("support"),
                (String) request.get("repayment"), (String) request.get("international"),
                (String) request.get("admission"), (String) request.get("nationality"));
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferencias de financiación no válidas; usa las opciones publicadas o déjalas sin responder");
    }
}
