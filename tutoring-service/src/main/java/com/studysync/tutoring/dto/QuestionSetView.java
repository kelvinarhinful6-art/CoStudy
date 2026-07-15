package com.studysync.tutoring.dto;

import java.util.List;

public record QuestionSetView(String setLabel, int attemptNumber, List<QuestionView> questions) {}
