package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;

public record ApplyRequest(@NotBlank String userId, @NotBlank String courseId) {}
