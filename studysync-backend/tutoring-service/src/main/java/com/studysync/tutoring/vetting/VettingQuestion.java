package com.studysync.tutoring.vetting;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "vetting_question", schema = "tutoring")
public class VettingQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "question_id")
    private UUID questionId;
    
    @Column(name = "question_text", nullable = false)
    private String questionText;
    
    @Column(name = "is_active")
    private boolean isActive = true;
    
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    
    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }

    public UUID getQuestionId() { return questionId; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String text) { this.questionText = text; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { this.isActive = active; }
    public Instant getCreatedAt() { return createdAt; }
}