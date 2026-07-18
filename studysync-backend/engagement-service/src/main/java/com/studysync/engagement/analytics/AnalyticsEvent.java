package com.studysync.engagement.analytics;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "analytics_event", schema = "engagement")
public class AnalyticsEvent {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "user_id", nullable = false) private String userId;
    @Column(name = "event_type", nullable = false) private String eventType;  // e.g. LOGIN, GROUP_JOIN
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); }

    public void setUserId(String v) { this.userId = v; }
    public String getEventType() { return eventType; }
    public void setEventType(String v) { this.eventType = v; }
}
