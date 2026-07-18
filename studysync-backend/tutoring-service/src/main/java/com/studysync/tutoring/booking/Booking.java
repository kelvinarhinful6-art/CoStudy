package com.studysync.tutoring.booking;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "booking", schema = "tutoring")
public class Booking {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "student_id", nullable = false) private String studentId;
    @Column(name = "tutor_id", nullable = false) private String tutorId;
    @Column(name = "course_id", nullable = false) private String courseId;

    @Column(nullable = false) private double hours;
    @Column(name = "hourly_rate", nullable = false) private double hourlyRate;
    @Column(name = "gross_amount", nullable = false) private double grossAmount;
    @Column(name = "commission_pct", nullable = false) private double commissionPct;
    @Column(name = "platform_fee", nullable = false) private double platformFee;
    @Column(name = "tutor_earning", nullable = false) private double tutorEarning;
    @Column(nullable = false) private String currency;
    @Column(name = "zoom_link") private String zoomLink;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false) private BookingStatus status;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist void onCreate() { Instant n = Instant.now(); createdAt = n; updatedAt = n; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }

    public UUID getBookingId() { return bookingId; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String v) { this.studentId = v; }
    public String getTutorId() { return tutorId; }
    public void setTutorId(String v) { this.tutorId = v; }
    public String getCourseId() { return courseId; }
    public void setCourseId(String v) { this.courseId = v; }
    public double getHours() { return hours; }
    public void setHours(double v) { this.hours = v; }
    public double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(double v) { this.hourlyRate = v; }
    public double getGrossAmount() { return grossAmount; }
    public void setGrossAmount(double v) { this.grossAmount = v; }
    public double getCommissionPct() { return commissionPct; }
    public void setCommissionPct(double v) { this.commissionPct = v; }
    public double getPlatformFee() { return platformFee; }
    public void setPlatformFee(double v) { this.platformFee = v; }
    public double getTutorEarning() { return tutorEarning; }
    public void setTutorEarning(double v) { this.tutorEarning = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus v) { this.status = v; }
    public String getZoomLink() { return zoomLink; }
    public void setZoomLink(String v) { this.zoomLink = v; }
}