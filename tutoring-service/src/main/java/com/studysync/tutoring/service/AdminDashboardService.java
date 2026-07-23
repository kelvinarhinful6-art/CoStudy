package com.studysync.tutoring.service;

import com.studysync.tutoring.booking.*;
import com.studysync.tutoring.dto.AdminDashboardDTOs.*;
import com.studysync.tutoring.exception.BadRequestException;
import com.studysync.tutoring.exception.NotFoundException;
import com.studysync.tutoring.vetting.ApplicationStatus;
import com.studysync.tutoring.vetting.TutorApplication;
import com.studysync.tutoring.vetting.TutorApplicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminDashboardService {

    private final BookingRepository bookingRepository;
    private final TutorPayoutRepository payoutRepository;
    private final TutorApplicationRepository applicationRepository;

    public AdminDashboardService(BookingRepository bookingRepository,
                                 TutorPayoutRepository payoutRepository,
                                 TutorApplicationRepository applicationRepository) {
        this.bookingRepository = bookingRepository;
        this.payoutRepository = payoutRepository;
        this.applicationRepository = applicationRepository;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    @Transactional(readOnly = true)
    public List<TutorSummaryDto> getTutorDashboardList() {
        List<Booking> completedBookings = bookingRepository.findByStatus(BookingStatus.COMPLETED);

        // Map tutorId -> list of completed bookings
        Map<String, List<Booking>> tutorBookingsMap = completedBookings.stream()
                .collect(Collectors.groupingBy(Booking::getTutorId));

        // Also fetch all approved tutor applications to include approved tutors even if 0 completed sessions
        List<TutorApplication> approvedApps = applicationRepository.findAll().stream()
                .filter(a -> a.getStatus() == ApplicationStatus.APPROVED)
                .toList();

        Set<String> allTutorIds = new HashSet<>(tutorBookingsMap.keySet());
        for (TutorApplication app : approvedApps) {
            allTutorIds.add(app.getUserId());
        }

        List<TutorSummaryDto> result = new ArrayList<>();
        for (String tutorId : allTutorIds) {
            List<Booking> bookings = tutorBookingsMap.getOrDefault(tutorId, Collections.emptyList());
            long completedSessions = bookings.size();

            // Total tutor earnings (50% of gross)
            double totalEarnings = round2(bookings.stream()
                    .mapToDouble(b -> b.getGrossAmount() * 0.5)
                    .sum());

            List<TutorPayout> payouts = payoutRepository.findByTutorIdOrderByPaidAtDesc(tutorId);
            double totalPaidOut = round2(payouts.stream()
                    .mapToDouble(p -> p.getAmountPaid().doubleValue())
                    .sum());

            double unpaidBalance = round2(Math.max(0.0, totalEarnings - totalPaidOut));
            Instant lastPayoutDate = payouts.isEmpty() ? null : payouts.get(0).getPaidAt();
            String payoutStatus = unpaidBalance <= 0.01 ? "Paid" : "Unpaid";

            // Resolve tutor name from application or ID
            String tutorName = approvedApps.stream()
                    .filter(a -> a.getUserId().equals(tutorId))
                    .map(a -> a.getUserId())
                    .findFirst()
                    .orElse(tutorId);

            result.add(new TutorSummaryDto(
                    tutorId,
                    tutorName,
                    completedSessions,
                    totalEarnings,
                    totalPaidOut,
                    unpaidBalance,
                    lastPayoutDate,
                    payoutStatus
            ));
        }

        result.sort(Comparator.comparing(TutorSummaryDto::unpaidBalance).reversed());
        return result;
    }

    @Transactional(readOnly = true)
    public TutorDetailDto getTutorDetail(String tutorId) {
        List<Booking> completedBookings = bookingRepository.findByTutorIdAndStatus(tutorId, BookingStatus.COMPLETED);
        long completedSessions = completedBookings.size();

        double totalGrossRevenue = round2(completedBookings.stream().mapToDouble(Booking::getGrossAmount).sum());
        double totalTutorEarnings = round2(totalGrossRevenue * 0.5);
        double totalPlatformEarnings = round2(totalGrossRevenue * 0.5);

        List<TutorPayout> payouts = payoutRepository.findByTutorIdOrderByPaidAtDesc(tutorId);
        double totalPaidOut = round2(payouts.stream().mapToDouble(p -> p.getAmountPaid().doubleValue()).sum());

        double unpaidBalance = round2(Math.max(0.0, totalTutorEarnings - totalPaidOut));
        Instant lastPayoutDate = payouts.isEmpty() ? null : payouts.get(0).getPaidAt();

        String tutorName = applicationRepository.findAll().stream()
                .filter(a -> a.getUserId().equals(tutorId) && a.getStatus() == ApplicationStatus.APPROVED)
                .map(a -> a.getUserId())
                .findFirst()
                .orElse(tutorId);

        return new TutorDetailDto(
                tutorId,
                tutorName,
                completedSessions,
                totalGrossRevenue,
                totalTutorEarnings,
                totalPlatformEarnings,
                unpaidBalance,
                lastPayoutDate,
                payouts
        );
    }

    @Transactional
    public TutorDetailDto markTutorPaid(String tutorId, String periodLabel) {
        TutorDetailDto currentDetail = getTutorDetail(tutorId);
        if (currentDetail.unpaidBalance() <= 0.01) {
            throw new BadRequestException("Tutor has no unpaid balance to disburse");
        }

        TutorPayout payout = new TutorPayout();
        payout.setTutorId(tutorId);
        payout.setPeriodLabel(periodLabel != null && !periodLabel.isBlank() ? periodLabel : "Monthly Payout");
        payout.setAmountPaid(BigDecimal.valueOf(currentDetail.unpaidBalance()));
        payout.setSessionCount((int) currentDetail.completedSessions());
        payout.setPaidAt(Instant.now());
        payoutRepository.save(payout);

        return getTutorDetail(tutorId);
    }

    @Transactional(readOnly = true)
    public PlatformSummaryDto getPlatformSummary() {
        List<Booking> allBookings = bookingRepository.findAll();
        List<Booking> completedBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                .toList();
        List<Booking> activeBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.PENDING_PAYMENT)
                .toList();

        long totalTutors = applicationRepository.findAll().stream()
                .filter(a -> a.getStatus() == ApplicationStatus.APPROVED)
                .map(TutorApplication::getUserId)
                .distinct()
                .count();

        long totalStudents = allBookings.stream()
                .map(Booking::getStudentId)
                .distinct()
                .count();

        long totalCompletedSessions = completedBookings.size();
        long totalActiveBookings = activeBookings.size();

        double totalGross = completedBookings.stream().mapToDouble(Booking::getGrossAmount).sum();
        double totalPlatformRevenue = round2(totalGross * 0.5);

        List<TutorPayout> allPayouts = payoutRepository.findAll();
        double totalTutorPayoutsCompleted = round2(allPayouts.stream()
                .mapToDouble(p -> p.getAmountPaid().doubleValue())
                .sum());

        double totalTutorEarningsAll = round2(totalGross * 0.5);
        double totalTutorPayoutsPending = round2(Math.max(0.0, totalTutorEarningsAll - totalTutorPayoutsCompleted));

        // Current month earnings
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("UTC"));
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();

        List<Booking> monthlyCompleted = completedBookings.stream()
                .filter(b -> {
                    if (b.getCreatedAt() == null) return false;
                    ZonedDateTime dt = b.getCreatedAt().atZone(ZoneId.of("UTC"));
                    return dt.getMonthValue() == currentMonth && dt.getYear() == currentYear;
                })
                .toList();

        double monthlyGross = monthlyCompleted.stream().mapToDouble(Booking::getGrossAmount).sum();
        double monthlyPlatformEarnings = round2(monthlyGross * 0.5);
        double monthlyTutorEarnings = round2(monthlyGross * 0.5);

        long totalTransactions = completedBookings.size();

        return new PlatformSummaryDto(
                totalTutors,
                totalStudents,
                totalCompletedSessions,
                totalActiveBookings,
                totalPlatformRevenue,
                totalTutorPayoutsPending,
                totalTutorPayoutsCompleted,
                monthlyPlatformEarnings,
                monthlyTutorEarnings,
                totalTransactions
        );
    }
}
