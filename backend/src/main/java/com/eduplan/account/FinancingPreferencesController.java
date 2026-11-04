package com.eduplan.account;

import com.eduplan.auth.CuentaPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/me/financing-preferences")
public class FinancingPreferencesController {
    private final FinancingPreferencesService service;

    public FinancingPreferencesController(FinancingPreferencesService service) { this.service = service; }

    @GetMapping
    public FinancingPreferences get(@AuthenticationPrincipal CuentaPrincipal principal) { return service.get(principal); }

    @PutMapping
    public FinancingPreferences put(@AuthenticationPrincipal CuentaPrincipal principal, @RequestBody Map<String, Object> request) {
        return service.put(principal, request);
    }
}
