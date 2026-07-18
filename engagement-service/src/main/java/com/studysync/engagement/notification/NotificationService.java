package com.studysync.engagement.notification;

import com.studysync.engagement.dto.CreateNotificationRequest;
import com.studysync.engagement.dto.NotificationResponse;
import com.studysync.engagement.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository repo;
    public NotificationService(NotificationRepository repo) { this.repo = repo; }

    @Transactional
    public NotificationResponse create(CreateNotificationRequest req) {
        Notification n = new Notification();
        n.setUserId(req.userId());
        n.setType(req.type());
        n.setMessage(req.message());
        n.setRead(false);
        repo.save(n);
        return toResponse(n);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(String userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public NotificationResponse markRead(UUID id) {
        Notification n = repo.findById(id).orElseThrow(() -> new NotFoundException("notification not found"));
        n.setRead(true);
        repo.save(n);
        return toResponse(n);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getNotificationId().toString(), n.getUserId(),
                n.getType(), n.getMessage(), n.isRead(), n.getCreatedAt().toString());
    }
}
