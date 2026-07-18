package com.studysync.learning.group;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// A membership row: one user in one group. Unique per (group,user).
@Entity
@Table(name = "group_member", schema = "learning",
       uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "user_id"}))
public class GroupMember {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "group_member_id")
    private UUID groupMemberId;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @PrePersist void onCreate() { this.joinedAt = Instant.now(); }

    public UUID getGroupMemberId() { return groupMemberId; }
    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID v) { this.groupId = v; }
    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }
    public Instant getJoinedAt() { return joinedAt; }
}
