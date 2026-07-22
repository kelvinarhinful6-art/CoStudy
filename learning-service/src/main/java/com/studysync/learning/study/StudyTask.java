package com.studysync.learning.study;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "study_task", schema = "learning")
public class StudyTask {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "task_id")
    private UUID taskId;
    @Column(name = "user_id", nullable = false)
    private String userId;
    @Column(nullable = false)
    private String title;
    private String subject;
    @Column
    private Instant deadline;
    @Column(name = "is_completed")
    private boolean isCompleted = false;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @PrePersist void onCreate() { this.createdAt = Instant.now(); }

    public UUID getTaskId() { return taskId; }
    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getSubject() { return subject; }
    public void setSubject(String v) { this.subject = v; }
    public Instant getDeadline() { return deadline; }
    public void setDeadline(Instant v) { this.deadline = v; }
    public boolean isCompleted() { return isCompleted; }
    public void setCompleted(boolean v) { this.isCompleted = v; }
    public Instant getCreatedAt() { return createdAt; }
}