package com.studysync.learning.study;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "study_session", schema = "learning")
public class StudySession {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "session_id")
    private UUID sessionId;
    @Column(name = "user_id", nullable = false)
    private String userId;
    private String subject;
    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;
    @Column(name = "session_date", updatable = false)
    private Instant sessionDate;
    @PrePersist void onCreate() { this.sessionDate = Instant.now(); }

    public UUID getSessionId() { return sessionId; }
    public String getUserId() { return userId; }
    public void setUserId(String v) { this.userId = v; }
    public String getSubject() { return subject; }
    public void setSubject(String v) { this.subject = v; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int v) { this.durationMinutes = v; }
    public Instant getSessionDate() { return sessionDate; }
}