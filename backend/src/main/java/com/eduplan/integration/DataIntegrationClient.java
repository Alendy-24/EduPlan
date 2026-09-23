package com.eduplan.integration;

import com.eduplan.integration.dto.InstitutionPayload;
import com.eduplan.integration.dto.IntegrationPage;
import com.eduplan.integration.dto.ProgramPayload;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class DataIntegrationClient {
    private static final ParameterizedTypeReference<IntegrationPage<InstitutionPayload>> INSTITUTION_PAGE =
            new ParameterizedTypeReference<>() { };
    private static final ParameterizedTypeReference<IntegrationPage<ProgramPayload>> PROGRAM_PAGE =
            new ParameterizedTypeReference<>() { };

    private final RestClient restClient;

    @Autowired
    public DataIntegrationClient(@Value("${eduplan.data-integration.base-url}") String baseUrl,
            @Value("${eduplan.data-integration.connect-timeout-ms:3000}") int connectTimeout,
            @Value("${eduplan.data-integration.read-timeout-ms:15000}") int readTimeout) {
        if (connectTimeout < 1 || readTimeout < 1) throw new IllegalArgumentException("Timeouts deben ser positivos");
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    DataIntegrationClient(RestClient restClient) { this.restClient = restClient; }

    public IntegrationPage<InstitutionPayload> getInstitutions(int page, int limit) {
        return getPage("/api/institutions", page, limit, INSTITUTION_PAGE);
    }

    public IntegrationPage<ProgramPayload> getPrograms(int page, int limit) {
        return getPage("/api/programs", page, limit, PROGRAM_PAGE);
    }

    private <T> IntegrationPage<T> getPage(
            String path,
            int page,
            int limit,
            ParameterizedTypeReference<IntegrationPage<T>> responseType
    ) {
        try {
            IntegrationPage<T> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(path)
                            .queryParam("page", page)
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .body(responseType);

            if (response == null) {
                throw new DataIntegrationException("La API de integración devolvió una respuesta vacía");
            }
            return response;
        } catch (RestClientException exception) {
            throw new DataIntegrationException("No fue posible consultar la API de integración", exception);
        }
    }
}
