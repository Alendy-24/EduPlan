package com.eduplan.integration;

public class DataIntegrationException extends RuntimeException {
    public DataIntegrationException(String message) {
        super(message);
    }

    public DataIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
