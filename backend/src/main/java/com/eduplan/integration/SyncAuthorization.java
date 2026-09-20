package com.eduplan.integration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Authorizes the actual handler, regardless of URL encoding or alternate mappings. */
@Configuration
public class SyncAuthorization implements WebMvcConfigurer, HandlerInterceptor {
    private final byte[] token;
    public SyncAuthorization(@Value("${eduplan.data-integration.admin-token:}") String token) {
        this.token = token.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(this); }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)
                || !DataSynchronizationController.class.isAssignableFrom(method.getBeanType())) return true;
        if (token.length < 32) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Sincronización deshabilitada: configure DATA_SYNC_ADMIN_TOKEN (mínimo 32 bytes)");
        }
        String supplied = request.getHeader("X-Sync-Token");
        if (supplied == null || !MessageDigest.isEqual(token, supplied.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credencial de sincronización inválida");
        }
        return true;
    }
}

