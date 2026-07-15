package com.studysync.tutoring.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreateReviewRequest(
        @NotBlank String bookingId,
        @Min(1) @Max(5) int rating,
        String comment) {}
