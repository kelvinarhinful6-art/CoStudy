package com.studysync.tutoring.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateReviewRequest(
        @NotBlank String requestedBy,
        @Min(1) @Max(5) int rating,
        @NotBlank @Size(min = 5, max = 500, message = "Review comment must be between 5 and 500 characters") String comment
) {}
