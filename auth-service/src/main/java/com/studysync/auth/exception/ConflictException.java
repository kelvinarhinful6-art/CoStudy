package com.studysync.auth.exception;

/** Thrown when something already exists (e.g. username/email taken). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
