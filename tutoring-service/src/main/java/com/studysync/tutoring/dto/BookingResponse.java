package com.studysync.tutoring.dto;

public record BookingResponse(
        String bookingId, String studentId, String tutorId, String courseId,
        double hours, double hourlyRate, double grossAmount,
        double commissionPct, double platformFee, double tutorEarning,
        String currency, String status, String zoomLink,
        String paymentReference, boolean paymentVerified) {}
