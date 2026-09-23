package com.eduplan.integration;

import com.eduplan.entities.Institucion;
import com.eduplan.entities.ProgramaAcademico;
import com.eduplan.integration.dto.InstitutionPayload;
import com.eduplan.integration.dto.ProgramPayload;
import com.eduplan.integration.dto.SyncReport;
import com.eduplan.repositories.InstitucionRepository;
import com.eduplan.repositories.ProgramaAcademicoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;

@Service
public class DataPagePersistenceService {
    private final InstitucionRepository institucionRepository;
    private final ProgramaAcademicoRepository programaRepository;
    private final JdbcTemplate jdbc;

    public DataPagePersistenceService(
            InstitucionRepository institucionRepository,
            ProgramaAcademicoRepository programaRepository,
            JdbcTemplate jdbc
    ) {
        this.institucionRepository = institucionRepository;
        this.programaRepository = programaRepository;
        this.jdbc = jdbc;
    }

    @Transactional
    public SyncReport saveInstitutions(List<InstitutionPayload> payloads) {
        Map<String, InstitutionPayload> validByCode = new LinkedHashMap<>();
        int skipped = 0;
        Map<String, Integer> reasons = new LinkedHashMap<>();
        for (InstitutionPayload payload : payloads) {
            if (!StringUtils.hasText(payload.code()) || !StringUtils.hasText(payload.name())) {
                skipped++;
                reasons.merge("invalidRecord", 1, Integer::sum);
                continue;
            }
            if (validByCode.put(payload.code().trim(), payload) != null) {
                skipped++;
                reasons.merge("duplicateInstitutionCode", 1, Integer::sum);
            }
        }

        Map<String, Institucion> existingByCode = institucionRepository
                .findAllByCodigoFuenteIn(validByCode.keySet())
                .stream()
                .collect(Collectors.toMap(Institucion::getCodigoFuente, Function.identity()));

        int created = 0;
        int updated = 0;
        for (Map.Entry<String, InstitutionPayload> entry : validByCode.entrySet()) {
            Institucion institution = existingByCode.get(entry.getKey());
            if (institution == null) {
                institution = new Institucion();
                institution.setCodigoFuente(entry.getKey());
                existingByCode.put(entry.getKey(), institution);
                created++;
            } else {
                updated++;
            }
            mapInstitution(entry.getValue(), institution);
        }

        institucionRepository.saveAll(existingByCode.values());
        return new SyncReport("institutions", 1, created, updated, skipped, 0, reasons);
    }

    @Transactional(readOnly = true)
    public void assertCompatibleSourceIdentities() {
        // Old hashes cannot be mapped back to source rows without guessing.
        if (Boolean.TRUE.equals(jdbc.queryForObject(
                "select exists(select 1 from programa_academico where clave_fuente ~ '^[a-f0-9]{64}$')",
                Boolean.class))) {
            throw new DataIntegrationException("Hay programas con claves de la versión anterior. Requieren conciliación antes de sincronizar.");
        }
    }

    @Transactional
    public SyncReport savePrograms(List<ProgramPayload> payloads) {
        int skipped = 0;
        Map<String, ProgramPayload> validByKey = new LinkedHashMap<>();
        Map<String, Integer> reasons = new LinkedHashMap<>();
        for (ProgramPayload payload : payloads) {
            if (!StringUtils.hasText(payload.sourceId()) || !payload.sourceId().startsWith("upr9-nkiz:row-")
                    || payload.sourceId().length() > 128) {
                throw new DataIntegrationException("La API debe proporcionar sourceId para cada programa; actualice data-integration");
            }
            if (!StringUtils.hasText(payload.code())
                    || !StringUtils.hasText(payload.institutionCode())
                    || !StringUtils.hasText(payload.name())) {
                skipped++;
                reasons.merge("invalidRecord", 1, Integer::sum);
                continue;
            }
            String sourceKey = payload.sourceId().trim();
            if (validByKey.put(sourceKey, payload) != null) {
                throw new DataIntegrationException("La fuente repitió un sourceId dentro de la misma página");
            }
        }

        Collection<String> institutionCodes = validByKey.values().stream()
                .map(ProgramPayload::institutionCode)
                .map(String::trim)
                .collect(Collectors.toSet());
        Map<String, Institucion> institutionsByCode = institucionRepository
                .findAllByCodigoFuenteIn(institutionCodes)
                .stream()
                .collect(Collectors.toMap(Institucion::getCodigoFuente, Function.identity()));
        Map<String, ProgramaAcademico> existingByKey = programaRepository
                .findAllByClaveFuenteIn(validByKey.keySet())
                .stream()
                .collect(Collectors.toMap(ProgramaAcademico::getClaveFuente, Function.identity()));

        int created = 0;
        int updated = 0;
        Map<String, ProgramaAcademico> toSave = new LinkedHashMap<>();
        for (Map.Entry<String, ProgramPayload> entry : validByKey.entrySet()) {
            ProgramPayload payload = entry.getValue();
            Institucion institution = institutionsByCode.get(payload.institutionCode().trim());
            if (institution == null) {
                skipped++;
                reasons.merge("missingInstitution", 1, Integer::sum);
                continue;
            }

            ProgramaAcademico program = existingByKey.get(entry.getKey());
            if (program == null) {
                program = new ProgramaAcademico();
                program.setClaveFuente(entry.getKey());
                created++;
            } else {
                updated++;
            }
            mapProgram(payload, institution, program);
            toSave.put(entry.getKey(), program);
        }

        programaRepository.saveAll(toSave.values());
        int reviewRequired = (int) toSave.values().stream().filter(ProgramaAcademico::isRequiereRevision).count();
        return new SyncReport("programs", 1, created, updated, skipped, reviewRequired, reasons);
    }

    private void mapInstitution(InstitutionPayload source, Institucion target) {
        target.setNombre(source.name());
        checkLength(source.code(), 30);
        checkLength(source.sector(), 100);
        checkLength(source.academicCharacter(), 100);
        checkLength(source.municipality(), 100);
        checkLength(source.department(), 100);
        checkLength(source.phone(), 100);
        checkLength(source.status(), 100);
        checkLength(source.website(), 255);
        target.setTipo(source.sector());
        target.setCaracterAcademico(source.academicCharacter());
        target.setCiudad(source.municipality());
        target.setDepartamento(source.department());
        target.setDireccion(source.address());
        target.setTelefono(source.phone());
        target.setEstado(source.status());
        target.setSitioWeb(source.website());
    }

    private void mapProgram(ProgramPayload source, Institucion institution, ProgramaAcademico target) {
        if (source.nameOrigin() == null
                || !List.of("SOURCE_NAME", "AWARDED_TITLE", "UNAVAILABLE").contains(source.nameOrigin())) {
            throw new DataIntegrationException("Origen del nombre del programa inválido");
        }
        checkLength(source.code(), 30);
        checkLength(source.modality(), 100);
        checkLength(source.municipality(), 100);
        checkLength(source.department(), 100);
        checkLength(source.status(), 100);
        checkLength(source.educationLevel(), 100);
        checkLength(source.academicLevel(), 100);
        checkLength(source.periodicity(), 100);
        checkLength(formatDuration(source.periodCount(), source.periodicity()), 100);
        target.setCodigoFuente(source.code().trim());
        target.setNombre(source.name());
        target.setNombreOriginal(source.rawName());
        target.setTituloOtorgado(source.awardedTitle());
        target.setAreaConocimiento(source.knowledgeArea());
        target.setOrigenNombre(source.nameOrigin());
        target.setRequiereRevision(source.reviewRequired());
        target.setModalidad(source.modality());
        target.setMunicipio(source.municipality());
        target.setDepartamento(source.department());
        target.setEstado(source.status());
        target.setDuracion(formatDuration(source.periodCount(), source.periodicity()));
        target.setNivelFormacion(source.educationLevel());
        target.setNivelAcademico(source.academicLevel());
        target.setPeriodicidad(source.periodicity());
        target.setInstitucion(institution);
    }

    private String formatDuration(String periodCount, String periodicity) {
        if (!StringUtils.hasText(periodCount)) {
            return periodicity;
        }
        if (!StringUtils.hasText(periodicity)) {
            return periodCount;
        }
        return periodCount.trim() + " " + periodicity.trim();
    }

    private void checkLength(String value, int maximum) {
        if (value != null && value.codePointCount(0, value.length()) > maximum) {
            throw new DataIntegrationException("Un campo de la fuente excede el límite de " + maximum
                    + " caracteres; revise el esquema. No se truncaron datos.");
        }
    }
}
