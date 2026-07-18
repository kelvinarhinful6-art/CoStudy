package com.studysync.engagement.web;

import com.studysync.engagement.analytics.AnalyticsService;
import com.studysync.engagement.dto.AnalyticsSummary;
import com.studysync.engagement.dto.RecordEventRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService service;
    public AnalyticsController(AnalyticsService service) { this.service = service; }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void record(@Valid @RequestBody RecordEventRequest req) {
        service.record(req);
    }

    @GetMapping("/summary")
    public AnalyticsSummary summary(@RequestParam String userId) {
        return service.summary(userId);
    }
}
