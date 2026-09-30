package com.eduplan.account;

import com.eduplan.auth.CuentaPrincipal;
import com.eduplan.entities.Cuenta;
import com.eduplan.repositories.CuentaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class AccountExplorationService {
    private static final Set<String> TYPES = Set.of("program", "institution", "opportunity");
    private static final Set<String> SNAPSHOT_FIELDS = Set.of(
            "sourceId", "code", "name", "institution", "city", "level", "duration", "modality",
            "status", "provenance", "institutionCode", "provider", "type", "deadline", "verifiedAt",
            "officialUrl", "academicCharacter", "sector", "website");
    private static final Set<String> AREAS = Set.of("Tecnología", "Salud", "Ciencias", "Artes", "Negocios", "Ciencias sociales", "Educación");
    private static final Set<String> MOTIVATIONS = Set.of("Resolver problemas", "Ayudar a otros", "Crear cosas nuevas", "Liderar equipos", "Investigar", "Trabajar con personas");
    private final CuentaRepository accounts;
    private final SavedOptionRepository savedOptions;
    private final AccountInterestsRepository interests;
    private final JsonMapper json = new JsonMapper();

    public AccountExplorationService(CuentaRepository accounts, SavedOptionRepository savedOptions,
                                     AccountInterestsRepository interests) {
        this.accounts = accounts;
        this.savedOptions = savedOptions;
        this.interests = interests;
    }

    @Transactional(readOnly = true)
    public List<SavedOptionResponse> listSaved(CuentaPrincipal principal) {
        Long accountId = requireAccount(principal, false).getIdCuenta();
        return savedOptions.findByAccountIdOrderBySavedAtDescDatabaseIdDesc(accountId).stream().map(this::savedResponse).toList();
    }

    @Transactional
    public SavedOptionResponse putSaved(CuentaPrincipal principal, String reference, SavedOptionRequest request) {
        Long accountId = requireAccount(principal, true).getIdCuenta();
        validateReference(reference);
        if (!TYPES.contains(request.type())) throw badRequest("Tipo de guardado no válido");
        validateHref(request.href());
        String snapshot = snapshotJson(request.snapshot());
        SavedOption item = savedOptions.findByAccountIdAndReference(accountId, reference).orElseGet(() -> {
            SavedOption created = new SavedOption();
            created.setAccountId(accountId);
            created.setReference(reference);
            created.setSavedAt(now());
            return created;
        });
        item.setType(request.type());
        item.setName(request.name().trim());
        item.setHref(request.href());
        item.setSnapshot(snapshot);
        item.setUpdatedAt(now());
        return savedResponse(savedOptions.save(item));
    }

    @Transactional
    public void removeSaved(CuentaPrincipal principal, String reference) {
        Long accountId = requireAccount(principal, true).getIdCuenta();
        validateReference(reference);
        savedOptions.deleteByAccountIdAndReference(accountId, reference);
    }

    @Transactional(readOnly = true)
    public InterestsResponse getInterests(CuentaPrincipal principal) {
        Long accountId = requireAccount(principal, false).getIdCuenta();
        return interests.findById(accountId).map(this::interestsResponse)
                .orElseGet(() -> new InterestsResponse(List.of(), List.of(), null));
    }

    @Transactional
    public InterestsResponse putInterests(CuentaPrincipal principal, InterestsRequest request) {
        Long accountId = requireAccount(principal, true).getIdCuenta();
        if (!AREAS.containsAll(request.areas()) || !MOTIVATIONS.containsAll(request.motivations())) {
            throw badRequest("Selecciona áreas y motivaciones disponibles");
        }
        AccountInterests item = interests.findById(accountId).orElseGet(() -> {
            AccountInterests created = new AccountInterests();
            created.setAccountId(accountId);
            return created;
        });
        item.setAreas(json.writeValueAsString(new LinkedHashSet<>(request.areas())));
        item.setMotivations(json.writeValueAsString(new LinkedHashSet<>(request.motivations())));
        item.setUpdatedAt(now());
        return interestsResponse(interests.save(item));
    }

    private Cuenta requireAccount(CuentaPrincipal principal, boolean lock) {
        if (principal == null || principal.userId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar");
        }
        Cuenta account = (lock ? accounts.findForUpdate(principal.userId()) : accounts.findById(principal.userId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La cuenta de la sesión ya no existe"));
        if (!account.isEstado()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta está inactiva");
        return account;
    }

    private void validateReference(String reference) {
        if (reference == null || reference.isBlank() || reference.length() > 200
                || reference.indexOf('/') >= 0 || reference.indexOf('\\') >= 0
                || reference.codePoints().anyMatch(Character::isISOControl)) {
            throw badRequest("Referencia de guardado no válida");
        }
    }

    private void validateHref(String href) {
        try {
            String decoded = URLDecoder.decode(href, StandardCharsets.UTF_8);
            URI uri = URI.create(href);
            if (!href.startsWith("/") || href.startsWith("//") || decoded.startsWith("//")
                    || decoded.indexOf('\\') >= 0 || uri.isAbsolute() || uri.getRawAuthority() != null
                    || decoded.codePoints().anyMatch(Character::isISOControl)) {
                throw badRequest("El guardado debe enlazar a una página interna");
            }
        } catch (IllegalArgumentException exception) {
            throw badRequest("El enlace del guardado no es válido");
        }
    }

    private String snapshotJson(Map<String, Object> snapshot) {
        if (snapshot == null) return null;
        Map<String, String> values = new LinkedHashMap<>();
        for (var field : snapshot.entrySet()) {
            if (!SNAPSHOT_FIELDS.contains(field.getKey()) || !(field.getValue() instanceof String value)
                    || value.length() > 2000 || value.codePoints().anyMatch(Character::isISOControl)) {
                throw badRequest("El resumen del guardado debe contener campos de texto válidos");
            }
            values.put(field.getKey(), value);
        }
        String serialized = json.writeValueAsString(values);
        if (serialized.getBytes(StandardCharsets.UTF_8).length > 8192) throw badRequest("El resumen del guardado es demasiado grande");
        return serialized;
    }

    @SuppressWarnings("unchecked")
    private SavedOptionResponse savedResponse(SavedOption item) {
        Map<String, String> snapshot = item.getSnapshot() == null ? null : json.readValue(item.getSnapshot(), Map.class);
        return new SavedOptionResponse(item.getReference(), item.getType(), item.getName(), item.getHref(),
                snapshot, item.getSavedAt(), item.getUpdatedAt());
    }

    private InterestsResponse interestsResponse(AccountInterests item) {
        return new InterestsResponse(List.of(json.readValue(item.getAreas(), String[].class)),
                List.of(json.readValue(item.getMotivations(), String[].class)), item.getUpdatedAt());
    }

    private static Instant now() { return Instant.now().truncatedTo(ChronoUnit.MICROS); }
    private static ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
