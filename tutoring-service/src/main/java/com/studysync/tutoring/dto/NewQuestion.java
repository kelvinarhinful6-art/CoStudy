package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;

public record NewQuestion(
        @NotBlank String prompt,
        @NotBlank String optionA, @NotBlank String optionB,
        @NotBlank String optionC, @NotBlank String optionD,
        @NotBlank String correctOption) {}
