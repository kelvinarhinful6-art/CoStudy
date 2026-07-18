package com.studysync.engagement.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateNotificationRequest(
        @NotBlank String userId, @NotBlank String type, @NotBlank String message) {}
