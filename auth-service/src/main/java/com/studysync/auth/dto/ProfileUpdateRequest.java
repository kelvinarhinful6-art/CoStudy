package com.studysync.auth.dto;

public record ProfileUpdateRequest(
    String fullName,
    String program,
    Integer age,
    Integer yearOfStudy
) {}