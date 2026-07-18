package com.studysync.tutoring.dto;

public record SubscriptionResponse(
        String userId, String tier, boolean active, String expiresAt) {}
