package com.studysync.tutoring.vetting;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Record of the admin's approve/decline decision.
@Entity
@Table(name = "admin_review", schema = "tutoring")
public class AdminReview {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "review_id")
    private UUID reviewId;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "admin_id", nullable = false)
    private String adminId;

    @Column(nullable = false)
    private String decision;   // APPROVED or REJECTED

    @Column(length = 1000)
    private String notes;

    @Column(name = "reviewed_at", nullable = false, updatable = false)
    private Instant reviewedAt;

    @PrePersist void onCreate() { reviewedAt = Instant.now(); }

    public void setApplicationId(UUID v) { this.applicationId = v; }
    public void setAdminId(String v) { this.adminId = v; }
    public void setDecision(String v) { this.decision = v; }
    public void setNotes(String v) { this.notes = v; }
}
