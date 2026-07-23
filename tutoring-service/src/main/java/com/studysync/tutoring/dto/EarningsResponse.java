package com.studysync.tutoring.dto;

public record EarningsResponse(
        String tutorId,
        int sessions,
        double totalEarned,
        String currency,
        double latestEarning
) {
    public EarningsResponse(String tutorId, int sessions, double totalEarned, String currency) {
        this(tutorId, sessions, totalEarned, currency, 0.0);
    }
}

