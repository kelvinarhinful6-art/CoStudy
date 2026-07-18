package com.studysync.engagement.notification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification", schema = "engagement")
public class Notification {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notification_id")
    private UUID notificationId;

    @Column(name = "user_id", nullable = false) private String userId;
    @Column(nullable = false) private String type;        // e.g. BOOKING, GROUP, SYSTEM
    @Column(nullable = false, length = 1000) private String message;
    @Column(name = "is_read", nullable = false) private boolean read;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); }

    public UUID getNotificationId() { return notificationId; }
    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }
    public String getType() { return type; }
    public void setType(String v) { this.type = v; }
    public String getMessage() { return message; }
    public void setMessage(String v) { this.message = v; }
    public boolean isRead() { return read; }
    public void setRead(boolean v) { this.read = v; }
    public Instant getCreatedAt() { return createdAt; }
}
