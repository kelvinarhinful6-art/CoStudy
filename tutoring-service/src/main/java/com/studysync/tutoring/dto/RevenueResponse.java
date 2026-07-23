package com.studysync.tutoring.dto;

public record RevenueResponse(
        int sessions,
        double totalCommission,
        String currency,
        double latestCommission
) {
    public RevenueResponse(int sessions, double totalCommission, String currency) {
        this(sessions, totalCommission, currency, 0.0);
    }
}

