package com.studysync.tutoring.dto;

public record AttemptResult(
        double scorePct, boolean passed, String status, int attemptsUsed, String message) {}
