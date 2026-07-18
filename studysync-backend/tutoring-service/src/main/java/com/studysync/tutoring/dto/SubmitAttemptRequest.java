package com.studysync.tutoring.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SubmitAttemptRequest(@NotNull List<AnswerDto> answers) {}
