package com.studysync.engagement.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateAdRequest(@NotBlank String title, @NotBlank String body) {}
