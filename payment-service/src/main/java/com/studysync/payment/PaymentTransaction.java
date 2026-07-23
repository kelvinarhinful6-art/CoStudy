package com.studysync.payment;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "payment_transactions")
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private Long amountKobo; // Paystack amounts are in the smallest currency unit

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private String purpose; // e.g. "tutoring_booking", "pro_subscription"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    public enum EscrowStatus {
        HELD,
        RELEASED_TO_TUTOR,
        RELEASED_TO_PLATFORM,
        SPLIT_COMPLETED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "escrow_status")
    private EscrowStatus escrowStatus = EscrowStatus.HELD;

    @Column(name = "tutor_share_kobo")
    private Long tutorShareKobo = 0L;

    @Column(name = "platform_share_kobo")
    private Long platformShareKobo = 0L;

    @Column(name = "escrow_released_at")
    private Instant escrowReleasedAt;

    protected PaymentTransaction() {}

    public PaymentTransaction(String reference, String userId, Long amountKobo, String currency, String purpose) {
        this.reference = reference;
        this.userId = userId;
        this.amountKobo = amountKobo;
        this.currency = currency;
        this.purpose = purpose;
        this.status = PaymentStatus.PENDING;
        this.escrowStatus = EscrowStatus.HELD;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getReference() { return reference; }
    public String getUserId() { return userId; }
    public Long getAmountKobo() { return amountKobo; }
    public String getCurrency() { return currency; }
    public String getPurpose() { return purpose; }
    public PaymentStatus getStatus() { return status; }
    public EscrowStatus getEscrowStatus() { return escrowStatus; }
    public Long getTutorShareKobo() { return tutorShareKobo; }
    public Long getPlatformShareKobo() { return platformShareKobo; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public Instant getEscrowReleasedAt() { return escrowReleasedAt; }

    public void markSuccess() {
        this.status = PaymentStatus.SUCCESS;
        this.escrowStatus = EscrowStatus.HELD;
        this.verifiedAt = Instant.now();
    }

    public void markFailed() {
        this.status = PaymentStatus.FAILED;
        this.verifiedAt = Instant.now();
    }

    public void releaseEscrow(boolean sessionCompleted) {
        this.escrowReleasedAt = Instant.now();
        if (sessionCompleted) {
            this.tutorShareKobo = this.amountKobo / 2;
            this.platformShareKobo = this.amountKobo - this.tutorShareKobo;
            this.escrowStatus = EscrowStatus.SPLIT_COMPLETED;
        } else {
            this.tutorShareKobo = 0L;
            this.platformShareKobo = this.amountKobo;
            this.escrowStatus = EscrowStatus.RELEASED_TO_PLATFORM;
        }
    }
}
