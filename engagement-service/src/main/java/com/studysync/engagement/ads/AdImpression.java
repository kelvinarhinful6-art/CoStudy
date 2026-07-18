package com.studysync.engagement.ads;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Records when a user was last shown an ad (to enforce <= 1 per hour).
@Entity
@Table(name = "ad_impression", schema = "engagement")
public class AdImpression {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "impression_id")
    private UUID impressionId;

    @Column(name = "user_id", nullable = false) private String userId;
    @Column(name = "ad_id", nullable = false) private UUID adId;
    @Column(name = "shown_at", nullable = false, updatable = false) private Instant shownAt;

    @PrePersist void onCreate() { shownAt = Instant.now(); }

    public void setUserId(String v) { this.userId = v; }
    public void setAdId(UUID v) { this.adId = v; }
    public Instant getShownAt() { return shownAt; }
}
