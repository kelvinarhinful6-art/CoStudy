package com.studysync.tutoring.vetting;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// One application = one user applying to tutor one course.
@Entity
@Table(name = "tutor_application", schema = "tutoring",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "course_id"}))
public class TutorApplication {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "application_id")
    private UUID applicationId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "course_id", nullable = false)
    private String courseId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status;

    @Column(name = "attempts_used", nullable = false)
    private int attemptsUsed;

    @Column(name = "document_ref")
    private String documentRef;   // simple reference/URL the applicant submits

    @Column(name = "hourly_rate")
    private Double hourlyRate;     // set after approval; needed before bookings

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist void onCreate() { Instant n = Instant.now(); createdAt = n; updatedAt = n; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }

    public UUID getApplicationId() { return applicationId; }
    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }
    public String getCourseId() { return courseId; }
    public void setCourseId(String v) { this.courseId = v; }
    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus v) { this.status = v; }
    public int getAttemptsUsed() { return attemptsUsed; }
    public void setAttemptsUsed(int v) { this.attemptsUsed = v; }
    public String getDocumentRef() { return documentRef; }
    public void setDocumentRef(String v) { this.documentRef = v; }
    public Double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(Double v) { this.hourlyRate = v; }
}
