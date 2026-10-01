package com.eduplan.account;

import org.springframework.stereotype.Component;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;

/** The same versioned catalog is consumed by React, Express and Spring. */
@Component
public class MatchingCatalog {
    private final JsonNode config;
    public MatchingCatalog() throws Exception {
        try (var input = new ClassPathResource("matching-v2.json").getInputStream()) { config = new JsonMapper().readTree(input); }
    }
    public String version() { return config.get("version").asText(); }
    private static String key(String text) { return Normalizer.normalize(text,Normalizer.Form.NFKD).replaceAll("\\p{M}","").toLowerCase(java.util.Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+"," ").strip().replaceAll("\\s+"," "); }
    private String canonical(String group,String field,String value,boolean allowEmpty) {
        if(value==null||value.codePoints().anyMatch(Character::isISOControl))throw invalid();
        if(value.isBlank()&&allowEmpty)return "";
        for(var option:config.get(group))if(key(option.get(field).asText()).equals(key(value)))return option.get(field).asText();
        throw invalid();
    }
    private List<String> values(String group,String field,List<String> items) {
        var result=new ArrayList<String>();
        for(var item:items){var value=canonical(group,field,item,false);if(result.contains(value))throw invalid();result.add(value);}
        return List.copyOf(result);
    }
    public boolean validFormation(String academicLevel,String id) {
        if(id.isEmpty())return true;
        for(var value:config.get("formations"))if(value.get("academicLevel").asText().equals(academicLevel)&&value.get("id").asText().equals(id)&&value.path("selectable").asBoolean(true))return true;
        return false;
    }
    public MatchingPreferences normalize(MatchingPreferences p) {
        var value=new MatchingPreferences(values("nbcs","name",p.specificNbcs()),values("activities","label",p.activities()),values("contexts","label",p.contexts()),values("nbcs","name",p.excludedNbcs()),canonical("locationPriorities","id",p.locationImportance(),true),canonical("modalityPriorities","id",p.modalityImportance(),true),canonical("durationOptions","id",p.duration(),true),canonical("sectorOptions","id",p.sector(),true),p.exclusionsReviewed());
        if(value.specificNbcs().stream().anyMatch(value.excludedNbcs()::contains))throw invalid();
        return value;
    }
    private static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Revisa las preferencias de afinación: hay opciones no válidas o contradictorias"); }
}
