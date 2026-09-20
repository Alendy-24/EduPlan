package com.eduplan.integration;

public class SyncBusyException extends RuntimeException {
    public SyncBusyException() { super("Ya existe una sincronización en curso"); }
}

