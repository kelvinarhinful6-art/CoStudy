package com.studysync.tutoring.booking;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Created when a session is completed. Records the money split (simulated).
@Entity
@Table(name = "payment_transaction", schema = "tutoring")
public class PaymentTransaction {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tx_id")
    private UUID txId;

    @Column(name = "booking_id", nullable = false) private UUID bookingId;
    @Column(name = "student_id", nullable = false) private String studentId;
    @Column(name = "tutor_id", nullable = false) private String tutorId;

    @Column(name = "gross_amount", nullable = false) private double grossAmount;
    @Column(name = "platform_fee", nullable = false) private double platformFee;
    @Column(name = "tutor_earning", nullable = false) private double tutorEarning;
    @Column(nullable = false) private String currency;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); }

    public void setBookingId(UUID v) { this.bookingId = v; }
    public void setStudentId(String v) { this.studentId = v; }
    public String getTutorId() { return tutorId; }
    public void setTutorId(String v) { this.tutorId = v; }
    public double getGrossAmount() { return grossAmount; }
    public void setGrossAmount(double v) { this.grossAmount = v; }
    public double getPlatformFee() { return platformFee; }
    public void setPlatformFee(double v) { this.platformFee = v; }
    public double getTutorEarning() { return tutorEarning; }
    public void setTutorEarning(double v) { this.tutorEarning = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
}
