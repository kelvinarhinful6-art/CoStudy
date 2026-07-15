package com.studysync.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** What the client sends to log in. Accepts either username or email. */
public record LoginRequest(
        @NotBlank String usernameOrEmail,
        @NotBlank String password
) {
}
