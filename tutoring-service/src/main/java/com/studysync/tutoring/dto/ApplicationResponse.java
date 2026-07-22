package com.studysync.tutoring.dto;

public record ApplicationResponse(
        String applicationId, String userId, String courseId,
        String status, int attemptsUsed, String documentRef, boolean registeredCourse) {}
