package com.studysync.tutoring.dto;

import java.util.List;

public record TutorReviews(String tutorId, double averageRating, int count,
                           List<ReviewResponse> reviews) {}
