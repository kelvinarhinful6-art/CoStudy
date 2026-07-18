package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;

// Simulated Pro purchase (no real payment).
public record SubscribeRequest(@NotBlank String userId) {}
