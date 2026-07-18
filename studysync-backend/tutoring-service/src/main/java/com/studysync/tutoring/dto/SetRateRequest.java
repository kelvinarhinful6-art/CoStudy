package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record SetRateRequest(@NotBlank String courseId, @Positive double hourlyRate) {}
