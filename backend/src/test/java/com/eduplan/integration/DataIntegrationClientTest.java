package com.eduplan.integration;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.http.MediaType;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class DataIntegrationClientTest {
    @Test
    void parsesTypedPage() {
        var builder = RestClient.builder().baseUrl("http://integration");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://integration/api/institutions?page=1&limit=2"))
                .andRespond(withSuccess("""
                    {"data":[{"code":"2209","name":"Universidad","sector":"Oficial"}],
                    "page":1,"limit":2,"returned":1}
                    """, MediaType.APPLICATION_JSON));
        var page = new DataIntegrationClient(builder.build()).getInstitutions(1, 2);
        assertEquals("2209", page.data().getFirst().code());
        server.verify();
    }

    @Test
    void missingDataIsNotMistakenForSuccessfulEndOfCatalog() {
        var builder = RestClient.builder().baseUrl("http://integration");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://integration/api/programs?page=1&limit=100"))
                .andRespond(withSuccess("{\"page\":1,\"limit\":100,\"returned\":0}", MediaType.APPLICATION_JSON));
        assertThrows(DataIntegrationException.class,
                () -> new DataIntegrationClient(builder.build()).getPrograms(1, 100));
        server.verify();
    }

    @Test
    void upstreamErrorDoesNotLeakResponseBody() {
        var builder = RestClient.builder().baseUrl("http://integration");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://integration/api/programs?page=1&limit=100"))
                .andRespond(withServerError().body("private internal data"));
        var error = assertThrows(DataIntegrationException.class,
                () -> new DataIntegrationClient(builder.build()).getPrograms(1, 100));
        assertFalse(error.getMessage().contains("private"));
        server.verify();
    }
}
