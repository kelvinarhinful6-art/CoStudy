package com.studysync.engagement.analytics;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, UUID> {
    List<AnalyticsEvent> findByUserId(String userId);
}
