package com.studysync.tutoring.vetting;

import jakarta.persistence.*;
import java.util.UUID;

// A multiple-choice question belonging to a set (4 options, one correct).
@Entity
@Table(name = "question", schema = "tutoring")
public class Question {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "question_id")
    private UUID questionId;

    @Column(name = "set_id", nullable = false)
    private UUID setId;

    @Column(nullable = false, length = 2000)
    private String prompt;

    @Column(name = "option_a", nullable = false, length = 500) private String optionA;
    @Column(name = "option_b", nullable = false, length = 500) private String optionB;
    @Column(name = "option_c", nullable = false, length = 500) private String optionC;
    @Column(name = "option_d", nullable = false, length = 500) private String optionD;

    @Column(name = "correct_option", nullable = false)
    private String correctOption;  // "A","B","C" or "D"

    public UUID getQuestionId() { return questionId; }
    public UUID getSetId() { return setId; }
    public void setSetId(UUID v) { this.setId = v; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String v) { this.prompt = v; }
    public String getOptionA() { return optionA; }
    public void setOptionA(String v) { this.optionA = v; }
    public String getOptionB() { return optionB; }
    public void setOptionB(String v) { this.optionB = v; }
    public String getOptionC() { return optionC; }
    public void setOptionC(String v) { this.optionC = v; }
    public String getOptionD() { return optionD; }
    public void setOptionD(String v) { this.optionD = v; }
    public String getCorrectOption() { return correctOption; }
    public void setCorrectOption(String v) { this.correctOption = v; }
}
