package com.studysync.tutoring.vetting;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// A record of one test attempt and its score.
@Entity
@Table(name = "test_attempt", schema = "tutoring")
public class TestAttempt {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "attempt_id")
    private UUID attemptId;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "set_label", nullable = false)
    private String setLabel;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Column(name = "score_pct", nullable = false)
    private double scorePct;

    @Column(nullable = false)
    private boolean passed;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @PrePersist void onCreate() { submittedAt = Instant.now(); }

    public void setApplicationId(UUID v) { this.applicationId = v; }
    public void setSetLabel(String v) { this.setLabel = v; }
    public void setAttemptNumber(int v) { this.attemptNumber = v; }
    public void setScorePct(double v) { this.scorePct = v; }
    public void setPassed(boolean v) { this.passed = v; }
}
