package com.studysync.tutoring.service;

import com.studysync.tutoring.booking.*;
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

import java.util.List;
import java.util.UUID;

@Service
public class BookingService {

    private final BookingRepository bookings;
    private final PaymentTransactionRepository payments;
    private final TutorApplicationRepository applications;
    private final SubscriptionService subscriptions;
    private final double commissionPct;
    private final String currency;

    public BookingService(BookingRepository bookings, PaymentTransactionRepository payments,
                          TutorApplicationRepository applications, SubscriptionService subscriptions,
                          @Value("${billing.commission-pct:20}") double commissionPct,
                          @Value("${billing.currency:GHS}") String currency) {
        this.bookings = bookings; this.payments = payments;
        this.applications = applications; this.subscriptions = subscriptions;
        this.commissionPct = commissionPct; this.currency = currency;
    }

    private static double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    // A tutor (or admin) sets the hourly rate for an approved course.
    @Transactional
    public void setRate(String tutorId, SetRateRequest req) {
        TutorApplication app = applications.findByUserIdAndCourseId(tutorId, req.courseId())
                .orElseThrow(() -> new NotFoundException("no application for this tutor/course"));
        if (app.getStatus() != ApplicationStatus.APPROVED) {
            throw new BadRequestException("tutor is not approved for this course");
        }
        app.setHourlyRate(req.hourlyRate());
        applications.save(app);
    }

    // Student books a tutor. Pro-only. Computes the money split up front.
    @Transactional
    public BookingResponse create(CreateBookingRequest req) {
        if (!subscriptions.isPro(req.studentId())) {
            throw new ForbiddenException("Pro subscription required to book a tutor");
        }
        TutorApplication app = applications.findByUserIdAndCourseId(req.tutorId(), req.courseId())
                .orElseThrow(() -> new NotFoundException("tutor not found for this course"));
        if (app.getStatus() != ApplicationStatus.APPROVED) {
            throw new BadRequestException("tutor is not approved for this course");
        }
        if (app.getHourlyRate() == null) {
            throw new BadRequestException("tutor has not set an hourly rate yet");
        }

        double rate = app.getHourlyRate();
        double gross = round2(req.hours() * rate);
        double fee = round2(gross * commissionPct / 100.0);
        double earning = round2(gross - fee);

        Booking b = new Booking();
        b.setStudentId(req.studentId());
        b.setTutorId(req.tutorId());
        b.setCourseId(req.courseId());
        b.setHours(req.hours());
        b.setHourlyRate(rate);
        b.setGrossAmount(gross);
        b.setCommissionPct(commissionPct);
        b.setPlatformFee(fee);
        b.setTutorEarning(earning);
        b.setCurrency(currency);
        b.setStatus(BookingStatus.CONFIRMED);
        bookings.save(b);
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

    // Complete the session -> simulate payment: student pays, platform keeps fee, tutor earns.
    @Transactional
    public BookingResponse complete(UUID id) {
        Booking b = load(id);
        if (b.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("only a confirmed booking can be completed (status: "
                    + b.getStatus() + ")");
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
        return toResponse(b);
    }

    // Tutor earnings = sum of their tutor_earning across completed payments.
    @Transactional(readOnly = true)
    public EarningsResponse earnings(String tutorId) {
        List<PaymentTransaction> txs = payments.findByTutorId(tutorId);
        double total = round2(txs.stream().mapToDouble(PaymentTransaction::getTutorEarning).sum());
        return new EarningsResponse(tutorId, txs.size(), total, currency);
    }

    // Platform revenue = sum of commission across all payments.
    @Transactional(readOnly = true)
    public RevenueResponse revenue() {
        List<PaymentTransaction> txs = payments.findAll();
        double total = round2(txs.stream().mapToDouble(PaymentTransaction::getPlatformFee).sum());
        return new RevenueResponse(txs.size(), total, currency);
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
                b.getCurrency(), b.getStatus().name(), b.getZoomLink());
    }
    @Transactional
    public void deleteBooking(UUID bookingId) {
        bookings.findById(bookingId).ifPresent(bookings::delete);
    }
}
