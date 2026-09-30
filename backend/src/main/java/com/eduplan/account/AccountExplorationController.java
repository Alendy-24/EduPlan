package com.eduplan.account;

import com.eduplan.auth.CuentaPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/me")
public class AccountExplorationController {
    private final AccountExplorationService service;

    public AccountExplorationController(AccountExplorationService service) { this.service = service; }

    public record SavedList(List<SavedOptionResponse> data) {}

    @GetMapping("/saved")
    public SavedList saved(@AuthenticationPrincipal CuentaPrincipal principal) { return new SavedList(service.listSaved(principal)); }

    @PutMapping("/saved/{id}")
    public SavedOptionResponse save(@AuthenticationPrincipal CuentaPrincipal principal, @PathVariable String id,
                                   @Valid @RequestBody SavedOptionRequest request) {
        return service.putSaved(principal, id, request);
    }

    @DeleteMapping("/saved/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal CuentaPrincipal principal, @PathVariable String id) { service.removeSaved(principal, id); }

    @GetMapping("/interests")
    public InterestsResponse interests(@AuthenticationPrincipal CuentaPrincipal principal) { return service.getInterests(principal); }

    @PutMapping("/interests")
    public InterestsResponse interests(@AuthenticationPrincipal CuentaPrincipal principal, @Valid @RequestBody InterestsRequest request) {
        return service.putInterests(principal, request);
    }
}
