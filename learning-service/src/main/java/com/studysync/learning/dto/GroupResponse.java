package com.studysync.learning.dto;

public record GroupResponse(
        String groupId,
        String groupName,
        String courseId,
        String createdBy,
        String description,
        long memberCount,
        int matchScore
) {
    public GroupResponse(String groupId, String groupName, String courseId, String createdBy, String description, long memberCount) {
        this(groupId, groupName, courseId, createdBy, description, memberCount, 0);
    }
}

