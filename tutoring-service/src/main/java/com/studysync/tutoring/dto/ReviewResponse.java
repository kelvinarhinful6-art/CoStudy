package com.studysync.tutoring.dto;

public record ReviewResponse(
        String reviewId, String tutorId, String studentId, String courseId, String bookingId,
        int rating, String comment, String createdAt) {}
