package com.studysync.learning.invite;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_invite", schema = "learning")
public class GroupInvite {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "invite_id")
    private UUID inviteId;

    @Column(name = "group_id", nullable = false) private UUID groupId;
    @Column(name = "group_name") private String groupName;
    @Column(name = "from_user_id", nullable = false) private String fromUserId;
    @Column(name = "from_username") private String fromUsername;
    @Column(name = "to_user_id", nullable = false) private String toUserId;
    @Column(nullable = false) private String status; // PENDING, ACCEPTED, DECLINED
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); if (status == null) status = "PENDING"; }

    public UUID getInviteId() { return inviteId; }
    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID v) { this.groupId = v; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String v) { this.groupName = v; }
    public String getFromUserId() { return fromUserId; }
    public void setFromUserId(String v) { this.fromUserId = v; }
    public String getFromUsername() { return fromUsername; }
    public void setFromUsername(String v) { this.fromUsername = v; }
    public String getToUserId() { return toUserId; }
    public void setToUserId(String v) { this.toUserId = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public Instant getCreatedAt() { return createdAt; }
}