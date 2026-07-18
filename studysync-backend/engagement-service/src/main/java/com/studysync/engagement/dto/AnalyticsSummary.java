package com.studysync.engagement.dto;

import java.util.Map;

public record AnalyticsSummary(String userId, long total, Map<String, Long> byType) {}
