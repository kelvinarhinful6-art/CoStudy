package com.studysync.auth.dto;

import com.studysync.auth.user.UserType;

public record UserSummary(
    String userId,
    String username,
    String email,
    UserType userType,
    String fullName,
    String program,
    Integer age,
    Integer yearOfStudy
) {}