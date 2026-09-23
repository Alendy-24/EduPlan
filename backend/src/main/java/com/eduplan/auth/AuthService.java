package com.eduplan.auth;

import com.eduplan.auth.dto.AuthResponse;
import com.eduplan.auth.dto.LoginRequest;
import com.eduplan.auth.dto.RegisterRequest;
import com.eduplan.entities.Cuenta;
import com.eduplan.repositories.CuentaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
// codifica la contraseña y se identifica la cuenta con correo o telefono.
@Service
public class AuthService {

    private final CuentaRepository cuentaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            CuentaRepository cuentaRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.cuentaRepository = cuentaRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        String phone = normalizePhone(request.phone());

        if (email == null && phone == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debe proporcionar un correo o un teléfono"
            );
        }

        if (email != null && cuentaRepository.existsByCorreoIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El correo ya está registrado"
            );
        }

        if (phone != null && cuentaRepository.existsByTelefono(phone)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El teléfono ya está registrado"
            );
        }

        Cuenta cuenta = new Cuenta();
        cuenta.setCorreo(email);
        cuenta.setTelefono(phone);
        cuenta.setContrasena(passwordEncoder.encode(request.password()));
        cuenta.setEstado(true);

        Cuenta savedAccount = cuentaRepository.save(cuenta);

        String identifier = email != null ? email : phone;

        return createResponse(
                savedAccount,
                identifier
        );
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.identifier().trim();

        Cuenta cuenta = findByIdentifier(identifier)
                .orElseThrow(() -> invalidCredentials());

        if (!cuenta.isEstado()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "La cuenta está inactiva"
            );
        }

        if (!passwordEncoder.matches(
                request.password(),
                cuenta.getContrasena()
        )) {
            throw invalidCredentials();
        }

        return createResponse(cuenta, identifier);
    }

    private java.util.Optional<Cuenta> findByIdentifier(String identifier) {
        if (identifier.contains("@")) {
            return cuentaRepository.findByCorreoIgnoreCase(
                    normalizeEmail(identifier)
            );
        }

        return cuentaRepository.findByTelefono(
                normalizePhone(identifier)
        );
    }

    private AuthResponse createResponse(Cuenta cuenta, String identifier) {
        CuentaPrincipal principal = new CuentaPrincipal(
                cuenta.getId_cuenta(),
                identifier
        );

        String token = jwtService.generateToken(principal);

        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationMs(),
                cuenta.getId_cuenta(),
                cuenta.getCorreo(),
                cuenta.getTelefono()
        );
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Credenciales inválidas"
        );
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }

        return phone.trim()
                .replace(" ", "")
                .replace("-", "")
                .replace("(", "")
                .replace(")", "");
    }
}
