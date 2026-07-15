package com.studysync.tutoring.dto;

// Questions shown to the applicant - NO correct answer included.
public record QuestionView(
        String questionId, String prompt,
        String optionA, String optionB, String optionC, String optionD) {}
