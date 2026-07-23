package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreateBookingRequest(
        @NotBlank String studentId,
        @NotBlank String tutorId,
        String courseId,
        @Positive double hours) {}

