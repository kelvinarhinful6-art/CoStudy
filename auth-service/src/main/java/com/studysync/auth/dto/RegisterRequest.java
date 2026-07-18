package com.studysync.auth.dto;

import com.studysync.auth.user.UserType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** What the client sends to register. The annotations validate the input. */
public record RegisterRequest(
        @NotBlank String username,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotNull UserType userType
) {
}
