package com.studysync.auth.dto;
import com.studysync.auth.user.UserType;
public record UserSummary(
    String userId,
    String username,
    String email,
    UserType userType,
    boolean verified,
    String fullName,
    String program,
    Integer age,
    Integer yearOfStudy,
    String tutorDisplayName
) {}