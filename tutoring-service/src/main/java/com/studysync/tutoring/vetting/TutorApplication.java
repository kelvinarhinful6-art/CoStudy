package com.studysync.tutoring.vetting;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// One application = one user applying to tutor one course.
// Note: a user may apply for the same course more than once (e.g. after a rejection),
// up to MAX_APPLICATIONS_PER_COURSE in VettingService, so there is intentionally NO
// unique constraint on (user_id, course_id).
@Entity
@Table(name = "tutor_application", schema = "tutoring")
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

    @Column(name = "is_registered_course")
    private Boolean registeredCourse; // true if the course had vetting requirements at apply time

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
    public Boolean isRegisteredCourse() { return registeredCourse; }
    public void setRegisteredCourse(Boolean v) { this.registeredCourse = v; }
    public Double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(Double v) { this.hourlyRate = v; }
}
