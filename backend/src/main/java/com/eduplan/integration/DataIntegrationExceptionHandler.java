package com.eduplan.integration;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = DataSynchronizationController.class)
public class DataIntegrationExceptionHandler {
    @ExceptionHandler(SyncBusyException.class)
    public ProblemDetail busy(SyncBusyException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(SyncFailedException.class)
    public ProblemDetail failed(SyncFailedException exception) {
        HttpStatus status = exception.getCause() instanceof DataIntegrationException
                ? HttpStatus.BAD_GATEWAY : HttpStatus.INTERNAL_SERVER_ERROR;
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(status, exception.getMessage());
        detail.setProperty("committedProgress", exception.getProgress());
        if (exception.getCause() instanceof DataIntegrationException cause) {
            detail.setProperty("reason", cause.getMessage());
        }
        // Do not expose SQL, connection strings, upstream bodies or credentials.
        return detail;
    }
    @ExceptionHandler(DataIntegrationException.class)
    public ProblemDetail handleDataIntegrationException(DataIntegrationException exception) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);
        detail.setTitle("Error de integración de datos");
        detail.setDetail(exception.getMessage());
        return detail;
    }
}
