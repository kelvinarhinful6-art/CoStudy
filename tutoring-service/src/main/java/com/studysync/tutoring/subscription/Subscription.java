package com.studysync.tutoring.subscription;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Tracks a user's plan. One row per user.
@Entity
@Table(name = "subscription", schema = "tutoring",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id"}))
public class Subscription {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "subscription_id")
    private UUID subscriptionId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tier tier;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;     // null = no expiry (free)

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist @PreUpdate void touch() { updatedAt = Instant.now(); }

    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }
    public Tier getTier() { return tier; }
    public void setTier(Tier v) { this.tier = v; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant v) { this.startedAt = v; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant v) { this.expiresAt = v; }
}
