package com.studysync.engagement.notification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "push_token", schema = "engagement",
       uniqueConstraints = @UniqueConstraint(columnNames = {"token"}))
public class PushToken {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "push_token_id")
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "token", nullable = false)
    private String token;

    @Column(name = "platform")
    private String platform;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist void onCreate() { this.createdAt = Instant.now(); }

    public UUID getId() { return id; }
    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }
    public String getToken() { return token; }
    public void setToken(String v) { this.token = v; }
    public String getPlatform() { return platform; }
    public void setPlatform(String v) { this.platform = v; }
    public Instant getCreatedAt() { return createdAt; }
}
