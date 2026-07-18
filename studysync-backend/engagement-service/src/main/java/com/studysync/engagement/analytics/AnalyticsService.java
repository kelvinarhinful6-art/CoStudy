package com.studysync.engagement.analytics;

import com.studysync.engagement.dto.AnalyticsSummary;
import com.studysync.engagement.dto.RecordEventRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final AnalyticsEventRepository repo;
    public AnalyticsService(AnalyticsEventRepository repo) { this.repo = repo; }

    @Transactional
    public void record(RecordEventRequest req) {
        AnalyticsEvent e = new AnalyticsEvent();
        e.setUserId(req.userId());
        e.setEventType(req.eventType());
        repo.save(e);
    }

    @Transactional(readOnly = true)
    public AnalyticsSummary summary(String userId) {
        List<AnalyticsEvent> events = repo.findByUserId(userId);
        Map<String, Long> byType = events.stream()
                .collect(Collectors.groupingBy(AnalyticsEvent::getEventType, Collectors.counting()));
        return new AnalyticsSummary(userId, events.size(), byType);
    }
}
