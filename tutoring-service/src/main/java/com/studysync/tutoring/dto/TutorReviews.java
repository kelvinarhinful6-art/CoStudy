package com.studysync.tutoring.dto;

import java.util.List;
import java.util.Map;

public record TutorReviews(
        String tutorId,
        double averageRating,
        int count,
        List<ReviewResponse> reviews,
        Map<Integer, Integer> ratingDistribution
) {
    public TutorReviews(String tutorId, double averageRating, int count, List<ReviewResponse> reviews) {
        this(tutorId, averageRating, count, reviews, Map.of(1, 0, 2, 0, 3, 0, 4, 0, 5, 0));
    }
}

