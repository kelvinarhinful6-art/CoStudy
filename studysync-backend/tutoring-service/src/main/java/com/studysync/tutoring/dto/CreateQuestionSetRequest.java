package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

// Admin creates a question set (label A/B/C) for a course.
public record CreateQuestionSetRequest(
        @NotBlank String courseId,
        @NotBlank String setLabel,
        @NotEmpty List<NewQuestion> questions) {}
