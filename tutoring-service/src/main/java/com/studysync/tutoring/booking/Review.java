package com.studysync.tutoring.booking;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "review", schema = "tutoring")
public class Review {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "review_id")
    private UUID reviewId;

    @Column(name = "booking_id", nullable = false) private UUID bookingId;
    @Column(name = "student_id", nullable = false) private String studentId;
    @Column(name = "tutor_id", nullable = false) private String tutorId;
    @Column(name = "course_id", nullable = false) private String courseId;

    @Column(nullable = false) private int rating;     // 1..5
    @Column(length = 1000) private String comment;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); }

    public UUID getReviewId() { return reviewId; }
    public UUID getBookingId() { return bookingId; }
    public void setBookingId(UUID v) { this.bookingId = v; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String v) { this.studentId = v; }
    public String getTutorId() { return tutorId; }
    public void setTutorId(String v) { this.tutorId = v; }
    public String getCourseId() { return courseId; }
    public void setCourseId(String v) { this.courseId = v; }
    public int getRating() { return rating; }
    public void setRating(int v) { this.rating = v; }
    public String getComment() { return comment; }
    public void setComment(String v) { this.comment = v; }
    public Instant getCreatedAt() { return createdAt; }
}
