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
    private final PushTokenRepository pushTokens;
    private final ExpoPushService expo;

    public NotificationService(NotificationRepository repo, PushTokenRepository pushTokens, ExpoPushService expo) {
        this.repo = repo;
        this.pushTokens = pushTokens;
        this.expo = expo;
    }

    @Transactional
    public NotificationResponse create(CreateNotificationRequest req) {
        Notification n = new Notification();
        n.setUserId(req.userId());
        n.setType(req.type());
        n.setMessage(req.message());
        n.setRead(false);
        repo.save(n);

        // Push to every registered device for this user (lock-screen notification).
        String title = titleFor(req.type());
        for (PushToken t : pushTokens.findByUserId(req.userId())) {
            expo.send(t.getToken(), title, req.message());
        }
        return toResponse(n);
    }

    private String titleFor(String type) {
        return switch (type) {
            case "CHAT" -> "New message";
            case "INVITE" -> "Group invite";
            case "BOOKING" -> "Booking update";
            default -> "CoStudy";
        };
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

    @Transactional
    public void markAllRead(String userId) {
        List<Notification> list = repo.findByUserIdOrderByCreatedAtDesc(userId);
        for (Notification n : list) {
            if (!n.isRead()) {
                n.setRead(true);
            }
        }
        repo.saveAll(list);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getNotificationId().toString(), n.getUserId(),
                n.getType(), n.getMessage(), n.isRead(), n.getCreatedAt().toString());
    }
}
