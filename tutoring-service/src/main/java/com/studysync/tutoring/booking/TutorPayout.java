package com.studysync.tutoring.booking;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tutor_payouts", schema = "tutoring")
public class TutorPayout {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "payout_id")
    private UUID payoutId;

    @Column(name = "tutor_id", nullable = false)
    private String tutorId;

    @Column(name = "period_label", nullable = false)
    private String periodLabel;

    @Column(name = "amount_paid", nullable = false)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "session_count", nullable = false)
    private int sessionCount = 0;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (paidAt == null) {
            paidAt = now;
        }
        createdAt = now;
    }

    public UUID getPayoutId() { return payoutId; }
    public String getTutorId() { return tutorId; }
    public void setTutorId(String tutorId) { this.tutorId = tutorId; }
    public String getPeriodLabel() { return periodLabel; }
    public void setPeriodLabel(String periodLabel) { this.periodLabel = periodLabel; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }
    public int getSessionCount() { return sessionCount; }
    public void setSessionCount(int sessionCount) { this.sessionCount = sessionCount; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public Instant getCreatedAt() { return createdAt; }
}
