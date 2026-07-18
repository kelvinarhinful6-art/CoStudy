package com.studysync.engagement.dto;

import jakarta.validation.constraints.NotBlank;

public record RecordEventRequest(@NotBlank String userId, @NotBlank String eventType) {}
