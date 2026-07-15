package com.studysync.learning.dto;
import jakarta.validation.constraints.NotBlank;
public record JoinGroupRequest(@NotBlank String userId, String username) {}