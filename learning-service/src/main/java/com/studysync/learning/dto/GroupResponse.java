package com.studysync.learning.dto;

public record GroupResponse(
        String groupId,
        String groupName,
        String courseId,
        String createdBy,
        String description,
        long memberCount
) {}
