package com.studysync.learning.group;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// A study group, stored in learning.study_group
@Entity
@Table(name = "study_group", schema = "learning")
public class StudyGroup {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "group_id")
    private UUID groupId;

    @Column(name = "group_name", nullable = false)
    private String groupName;

    @Column(name = "course_id", nullable = false)
    private String courseId;       // which course this group is for

    @Column(name = "created_by", nullable = false)
    private String createdBy;      // userId of the creator

    @Column
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist void onCreate() { this.createdAt = Instant.now(); }

    public UUID getGroupId() { return groupId; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String v) { this.groupName = v; }
    public String getCourseId() { return courseId; }
    public void setCourseId(String v) { this.courseId = v; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String v) { this.createdBy = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public Instant getCreatedAt() { return createdAt; }
}
