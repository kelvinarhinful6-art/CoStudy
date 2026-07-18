package com.studysync.learning.dto;

import jakarta.validation.constraints.NotBlank;

// NOTE: createdBy is the userId. Later the gateway will inject this from the
// login token; for now the client sends it.
public record CreateGroupRequest(
        @NotBlank String groupName,
        @NotBlank String courseId,
        @NotBlank String createdBy,
        String description
) {}
