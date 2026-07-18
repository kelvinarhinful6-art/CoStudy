package com.studysync.auth.dto;

/** What we send back after a successful register or login. */
public record AuthResponse(
        String accessToken,
        long expiresInSeconds,
        UserSummary user
) {
}
