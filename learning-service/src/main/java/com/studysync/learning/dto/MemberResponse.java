package com.studysync.learning.dto;

public record MemberResponse(
    String userId,
    boolean isAdmin
) {}