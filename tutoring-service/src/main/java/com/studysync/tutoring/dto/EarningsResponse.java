package com.studysync.tutoring.dto;

public record EarningsResponse(String tutorId, int sessions, double totalEarned, String currency) {}
