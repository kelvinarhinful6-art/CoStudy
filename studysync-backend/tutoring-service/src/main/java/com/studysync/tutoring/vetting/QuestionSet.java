package com.studysync.tutoring.vetting;

import jakarta.persistence.*;
import java.util.UUID;

// A set of questions for a course. 3 sets per course: labels A, B, C.
@Entity
@Table(name = "question_set", schema = "tutoring",
       uniqueConstraints = @UniqueConstraint(columnNames = {"course_id", "set_label"}))
public class QuestionSet {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "set_id")
    private UUID setId;

    @Column(name = "course_id", nullable = false)
    private String courseId;

    @Column(name = "set_label", nullable = false)
    private String setLabel;   // "A", "B" or "C"

    public UUID getSetId() { return setId; }
    public String getCourseId() { return courseId; }
    public void setCourseId(String v) { this.courseId = v; }
    public String getSetLabel() { return setLabel; }
    public void setSetLabel(String v) { this.setLabel = v; }
}
