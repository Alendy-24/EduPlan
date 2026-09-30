package com.eduplan.account;

import com.eduplan.auth.CuentaPrincipal;
import com.eduplan.repositories.CuentaRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/me/account")
public class AccountProfileController {
    private final CuentaRepository accounts;
    private final AccountExplorationService access;

    public AccountProfileController(CuentaRepository accounts, AccountExplorationService access) { this.accounts = accounts; this.access = access; }

    public record AccountDetails(Long userId, String name, String email, String phone) {}
    public record UpdateAccountRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 30) String phone
    ) {}

    @GetMapping
    @Transactional(readOnly = true)
    public AccountDetails get(@AuthenticationPrincipal CuentaPrincipal principal) {
        var account = access.requireAccount(principal, false);
        return new AccountDetails(account.getIdCuenta(), account.getNombre(), account.getCorreo(), account.getTelefono());
    }

    @PutMapping
    @Transactional
    public AccountDetails update(@AuthenticationPrincipal CuentaPrincipal principal, @Valid @RequestBody UpdateAccountRequest request) {
        var account = access.requireAccount(principal, true);
        String name = request.name().strip();
        String phone = request.phone() == null ? null : request.phone().replaceAll("[\\s()\\-]", "");
        if (name.isBlank() || name.codePoints().anyMatch(Character::isISOControl) || phone != null && phone.codePoints().anyMatch(Character::isISOControl))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datos de cuenta no válidos");
        if (phone != null && phone.isBlank()) phone = null;
        if (phone != null && !phone.equals(account.getTelefono()) && accounts.existsByTelefono(phone))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El teléfono ya está registrado");
        account.setNombre(name);
        account.setTelefono(phone);
        return new AccountDetails(account.getIdCuenta(), account.getNombre(), account.getCorreo(), account.getTelefono());
    }
}
