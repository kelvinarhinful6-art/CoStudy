package com.studysync.engagement.dto;

public record NotificationResponse(
        String notificationId, String userId, String type, String message,
        boolean read, String createdAt) {}
