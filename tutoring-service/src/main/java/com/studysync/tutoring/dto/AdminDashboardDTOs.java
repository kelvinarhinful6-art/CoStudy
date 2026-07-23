package com.studysync.tutoring.dto;

import com.studysync.tutoring.booking.TutorPayout;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class AdminDashboardDTOs {

    public record TutorSummaryDto(
            String tutorId,
            String tutorName,
            long completedSessions,
            double totalEarnings,
            double totalPaidOut,
            double unpaidBalance,
            Instant lastPayoutDate,
            String payoutStatus
    ) {}

    public record TutorDetailDto(
            String tutorId,
            String tutorName,
            long completedSessions,
            double totalGrossRevenue,
            double totalTutorEarnings,
            double totalPlatformEarnings,
            double unpaidBalance,
            Instant lastPayoutDate,
            List<TutorPayout> payouts
    ) {}

    public record PlatformSummaryDto(
            long totalTutors,
            long totalStudents,
            long totalCompletedSessions,
            long totalActiveBookings,
            double totalPlatformRevenue,
            double totalTutorPayoutsPending,
            double totalTutorPayoutsCompleted,
            double monthlyPlatformEarnings,
            double monthlyTutorEarnings,
            long totalTransactions
    ) {}

    public record MarkPaidRequest(
            String periodLabel
    ) {}
}
