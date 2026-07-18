package com.studysync.auth.exception;

/** Thrown when login credentials are wrong. */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
