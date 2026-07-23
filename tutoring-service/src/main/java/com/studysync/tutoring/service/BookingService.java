package com.studysync.tutoring.service;

import com.studysync.tutoring.booking.*;
import com.studysync.tutoring.client.NotificationClient;
import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.exception.BadRequestException;
import com.studysync.tutoring.exception.ForbiddenException;
import com.studysync.tutoring.exception.NotFoundException;
import com.studysync.tutoring.subscription.SubscriptionService;
import com.studysync.tutoring.vetting.ApplicationStatus;
import com.studysync.tutoring.vetting.TutorApplication;
import com.studysync.tutoring.vetting.TutorApplicationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BookingService {

    private final BookingRepository bookings;
    private final PaymentTransactionRepository payments;
    private final TutorApplicationRepository applications;
    private final SubscriptionService subscriptions;
    private final NotificationClient notificationClient;
    private final RestTemplate restTemplate = new RestTemplate();
    private final double commissionPct;
    private final String currency;

    public BookingService(BookingRepository bookings, PaymentTransactionRepository payments,
                          TutorApplicationRepository applications, SubscriptionService subscriptions,
                          NotificationClient notificationClient,
                          @Value("${billing.commission-pct:50}") double commissionPct,
                          @Value("${billing.currency:GHS}") String currency) {
        this.bookings = bookings; this.payments = payments;
        this.applications = applications; this.subscriptions = subscriptions;
        this.notificationClient = notificationClient;
        this.commissionPct = 50.0; // Enforce 50/50 escrow split
        this.currency = currency;
    }

    private static double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    private void releaseEscrowOnPaymentService(String reference, boolean sessionCompleted) {
        if (reference == null || reference.isBlank()) return;
        try {
            String url = "http://payment-service:8080/api/payments/" + reference + "/release";
            restTemplate.postForEntity(url, Map.of("sessionCompleted", sessionCompleted), String.class);
        } catch (Exception ignored) {
            // best-effort escrow release call
        }
    }

    // A tutor (or admin) sets the hourly rate for an approved course.
    @Transactional
    public void setRate(String tutorId, SetRateRequest req) {
        TutorApplication app = applications.findByUserIdAndCourseId(tutorId, req.courseId()).stream()
                .filter(a -> a.getStatus() == ApplicationStatus.APPROVED)
                .findFirst()
                .orElseThrow(() -> new NotFoundException("tutor is not approved for this course"));
        app.setHourlyRate(req.hourlyRate());
        applications.save(app);
    }

    // Student books a tutor. Creates booking in PENDING_PAYMENT status.
    @Transactional
    public BookingResponse create(CreateBookingRequest req) {
        if (!subscriptions.isPro(req.studentId())) {
            throw new ForbiddenException("Pro subscription required to book a tutor");
        }

        String effectiveCourseId = (req.courseId() != null && !req.courseId().isBlank())
                ? req.courseId().trim().toUpperCase()
                : null;

        TutorApplication app = null;
        if (effectiveCourseId != null) {
            app = applications.findByUserIdAndCourseId(req.tutorId(), effectiveCourseId).stream()
                    .filter(a -> a.getStatus() == ApplicationStatus.APPROVED)
                    .findFirst()
                    .orElse(null);
        }

        if (app == null) {
            app = applications.findByUserId(req.tutorId()).stream()
                    .filter(a -> a.getStatus() == ApplicationStatus.APPROVED)
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("approved tutor application not found"));
        }

        if (effectiveCourseId == null) {
            effectiveCourseId = (app.getCourseId() != null && !app.getCourseId().isBlank())
                    ? app.getCourseId().toUpperCase()
                    : "GENERAL";
        }

        if (app.getHourlyRate() == null) {
            throw new BadRequestException("tutor has not set an hourly rate yet");
        }

        double rate = app.getHourlyRate();
        double gross = round2(req.hours() * rate);
        double fee = round2(gross * 0.5); // 50% platform split
        double earning = round2(gross * 0.5); // 50% tutor split

        Booking b = new Booking();
        b.setStudentId(req.studentId());
        b.setTutorId(req.tutorId());
        b.setCourseId(effectiveCourseId);
        b.setHours(req.hours());
        b.setHourlyRate(rate);
        b.setGrossAmount(gross);
        b.setCommissionPct(50.0);
        b.setPlatformFee(fee);
        b.setTutorEarning(earning);
        b.setCurrency(currency);
        b.setStatus(BookingStatus.PENDING_PAYMENT);
        b.setPaymentVerified(false);
        bookings.save(b);
        return toResponse(b);
    }


    @Transactional
    public BookingResponse confirmPayment(UUID bookingId, String paymentReference) {
        Booking b = load(bookingId);
        b.setPaymentVerified(true);
        b.setPaymentReference(paymentReference);
        b.setStatus(BookingStatus.CONFIRMED);
        bookings.save(b);

        // Notifications
        notificationClient.notify(b.getTutorId(), "BOOKING_NEW",
                "You have a new tutoring booking for " + b.getCourseId() + ".");
        notificationClient.notify(b.getStudentId(), "BOOKING_CONFIRMED",
                "Your booking for " + b.getCourseId() + " has been confirmed.");

        return toResponse(b);
    }

    @Transactional(readOnly = true)
    public BookingResponse get(UUID id) { return toResponse(load(id)); }

    @Transactional(readOnly = true)
    public List<BookingResponse> byStudent(String studentId) {
        return bookings.findByStudentId(studentId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> byTutor(String tutorId) {
        return bookings.findByTutorId(tutorId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public BookingResponse complete(UUID id) {
        Booking b = load(id);
        if (b.getStatus() != BookingStatus.CONFIRMED && b.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new BadRequestException("only an active booking can be completed (status: " + b.getStatus() + ")");
        }
        b.setStatus(BookingStatus.COMPLETED);
        bookings.save(b);

        PaymentTransaction tx = new PaymentTransaction();
        tx.setBookingId(b.getBookingId());
        tx.setStudentId(b.getStudentId());
        tx.setTutorId(b.getTutorId());
        tx.setGrossAmount(b.getGrossAmount());
        tx.setPlatformFee(b.getPlatformFee());
        tx.setTutorEarning(b.getTutorEarning());
        tx.setCurrency(b.getCurrency());
        payments.save(tx);

        releaseEscrowOnPaymentService(b.getPaymentReference(), true);

        notificationClient.notify(b.getStudentId(), "SESSION_COMPLETED",
                "Your tutoring session for " + b.getCourseId() + " is complete.");
        notificationClient.notify(b.getTutorId(), "SESSION_COMPLETED",
                "Your tutoring session for " + b.getCourseId() + " is complete.");

        return toResponse(b);
    }

    @Transactional
    public BookingResponse cancel(UUID id) {
        Booking b = load(id);
        if (b.getStatus() == BookingStatus.COMPLETED) {
            throw new BadRequestException("a completed booking cannot be cancelled");
        }
        b.setStatus(BookingStatus.CANCELLED);
        bookings.save(b);

        releaseEscrowOnPaymentService(b.getPaymentReference(), false);

        notificationClient.notify(b.getStudentId(), "BOOKING_CANCELLED",
                "Your tutoring booking for " + b.getCourseId() + " was cancelled.");
        notificationClient.notify(b.getTutorId(), "BOOKING_CANCELLED",
                "Tutoring booking for " + b.getCourseId() + " was cancelled.");

        return toResponse(b);
    }

    @Transactional(readOnly = true)
    public EarningsResponse earnings(String tutorId) {
        List<PaymentTransaction> txs = payments.findByTutorId(tutorId);
        double total = round2(txs.stream().mapToDouble(PaymentTransaction::getTutorEarning).sum());
        double latestEarning = txs.isEmpty() ? 0.0 : round2(txs.get(txs.size() - 1).getTutorEarning());
        return new EarningsResponse(tutorId, txs.size(), total, currency, latestEarning);
    }

    @Transactional(readOnly = true)
    public RevenueResponse revenue() {
        List<PaymentTransaction> txs = payments.findAll();
        double total = round2(txs.stream().mapToDouble(PaymentTransaction::getPlatformFee).sum());
        double latestCommission = txs.isEmpty() ? 0.0 : round2(txs.get(txs.size() - 1).getPlatformFee());
        return new RevenueResponse(txs.size(), total, currency, latestCommission);
    }


    @Transactional
    public BookingResponse setLink(UUID id, String zoomLink) {
        Booking b = load(id);
        b.setZoomLink(zoomLink);
        bookings.save(b);
        return toResponse(b);
    }

    @Transactional
    public BookingResponse startSession(UUID id) {
        Booking b = load(id);
        bookings.save(b);
        notificationClient.notify(b.getStudentId(), "SESSION_STARTED",
                "Your tutoring session for " + b.getCourseId() + " has started.");
        return toResponse(b);
    }

    @Transactional
    public BookingResponse endSession(UUID id) {
        Booking b = load(id);
        if (b.getStatus() == BookingStatus.CONFIRMED) {
            b.setStatus(BookingStatus.COMPLETED);
            PaymentTransaction tx = new PaymentTransaction();
            tx.setBookingId(b.getBookingId());
            tx.setStudentId(b.getStudentId());
            tx.setTutorId(b.getTutorId());
            tx.setGrossAmount(b.getGrossAmount());
            tx.setPlatformFee(b.getPlatformFee());
            tx.setTutorEarning(b.getTutorEarning());
            tx.setCurrency(b.getCurrency());
            payments.save(tx);

            releaseEscrowOnPaymentService(b.getPaymentReference(), true);

            notificationClient.notify(b.getStudentId(), "SESSION_COMPLETED",
                    "Your tutoring session for " + b.getCourseId() + " is complete.");
            notificationClient.notify(b.getTutorId(), "SESSION_COMPLETED",
                    "Your tutoring session for " + b.getCourseId() + " is complete.");
        }
        bookings.save(b);
        return toResponse(b);
    }

    private Booking load(UUID id) {
        return bookings.findById(id).orElseThrow(() -> new NotFoundException("booking not found"));
    }

    private BookingResponse toResponse(Booking b) {
        return new BookingResponse(b.getBookingId().toString(), b.getStudentId(), b.getTutorId(),
                b.getCourseId(), b.getHours(), b.getHourlyRate(), b.getGrossAmount(),
                b.getCommissionPct(), b.getPlatformFee(), b.getTutorEarning(),
                b.getCurrency(), b.getStatus().name(), b.getZoomLink(),
                b.getPaymentReference(), b.isPaymentVerified());
    }

    @Transactional
    public void deleteBooking(UUID bookingId) {
        bookings.findById(bookingId).ifPresent(bookings::delete);
    }
}
