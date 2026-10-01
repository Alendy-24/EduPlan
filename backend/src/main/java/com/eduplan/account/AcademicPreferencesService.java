package com.eduplan.account;

import com.eduplan.auth.CuentaPrincipal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;

@Service
public class AcademicPreferencesService {
    private final AccountExplorationService accounts;
    private final JdbcTemplate db;
    private final MatchingCatalog catalog;
    public AcademicPreferencesService(AccountExplorationService accounts, JdbcTemplate db, MatchingCatalog catalog) { this.accounts = accounts; this.db = db; this.catalog = catalog; }

    @Transactional(readOnly = true)
    public AcademicPreferences get(CuentaPrincipal principal) {
        long id = accounts.requireAccount(principal, false).getIdCuenta();
        return db.query("SELECT nivel_buscado,modalidad_preferida,municipio,departamento,movilidad,tipo_formacion FROM estudiante WHERE id_cuenta=?",
            (rs, row) -> new AcademicPreferences(text(rs.getString(1)),text(rs.getString(2)),text(rs.getString(3)),text(rs.getString(4)),text(rs.getString(5)),text(rs.getString(6))), id)
            .stream().findFirst().orElse(AcademicPreferences.empty());
    }

    @Transactional
    public AcademicPreferences put(CuentaPrincipal principal, AcademicPreferences request) {
        var account = accounts.requireAccount(principal, true); // serialize writes for this JWT account
        var value = new AcademicPreferences(text(request.academicLevel()),text(request.modality()),text(request.municipality()),text(request.department()),text(request.mobility()),text(request.educationLevel()));
        if (!Set.of("", "Pregrado", "Posgrado").contains(value.academicLevel())
            || !Set.of("", "Presencial", "Virtual", "A distancia", "Presencial-Virtual").contains(value.modality())
            || !Set.of("", "CITY", "DEPARTMENT", "ANY", "RELOCATE").contains(value.mobility())
            || !catalog.validFormation(value.academicLevel(),value.educationLevel())
            || value.mobility().equals("CITY") && value.municipality().isBlank()
            || value.mobility().equals("DEPARTMENT") && value.department().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferencias académicas no válidas; completa la ubicación requerida");
        // Keep legacy name/grade fields when a student row already exists. Do not touch presupuesto.
        String accountName = account.getNombre();
        // Account names allow120 characters; legacy estudiante.nombre allows100. Never alter the account name.
        String studentName = accountName.substring(0, accountName.offsetByCodePoints(0, Math.min(100, accountName.codePointCount(0, accountName.length()))));
        db.update("INSERT INTO estudiante(nombre,apellido,grado,municipio,departamento,id_cuenta,nivel_buscado,modalidad_preferida,movilidad,tipo_formacion) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id_cuenta) DO UPDATE SET municipio=excluded.municipio,departamento=excluded.departamento,nivel_buscado=excluded.nivel_buscado,modalidad_preferida=excluded.modalidad_preferida,movilidad=excluded.movilidad,tipo_formacion=excluded.tipo_formacion",
            studentName, "", "", value.municipality(), value.department(),account.getIdCuenta(),value.academicLevel(),value.modality(),value.mobility(),value.educationLevel());
        return value;
    }
    private static String text(String value) {
        String result = value == null ? "" : value.strip();
        if (result.codePoints().anyMatch(Character::isISOControl)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Texto de preferencias no válido");
        return result;
    }
}
