package com.studysync.engagement.web;

import com.studysync.engagement.dto.CreateNotificationRequest;
import com.studysync.engagement.dto.NotificationResponse;
import com.studysync.engagement.notification.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationResponse create(@Valid @RequestBody CreateNotificationRequest req) {
        return service.create(req);
    }

    @GetMapping
    public List<NotificationResponse> list(@RequestParam String userId) {
        return service.list(userId);
    }

    @PostMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable UUID id) {
        return service.markRead(id);
    }
}
