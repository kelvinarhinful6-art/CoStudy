package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;

public record AnswerDto(@NotBlank String questionId, @NotBlank String chosenOption) {}
