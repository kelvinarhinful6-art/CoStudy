package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;

public record DocumentRequest(@NotBlank String documentRef) {}
