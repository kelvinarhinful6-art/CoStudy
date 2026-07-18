package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;

// Admin approve/decline payload.
public record DecisionRequest(@NotBlank String adminId, String notes) {}
