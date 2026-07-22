package com.studysync.learning.notify;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Best-effort client that creates an in-app (and, on the engagement side, push)
 * notification in the engagement-service. Failures are swallowed on purpose: a
 * notification must never break the primary flow (sending a chat message, etc.).
 */
@Component
public class NotificationClient {

    private final RestTemplate rest = new RestTemplate();
    private final String baseUrl = "http://engagement-service:8080/api/notifications";

    public void notify(String userId, String type, String message) {
        try {
            rest.postForEntity(baseUrl,
                    Map.of("userId", userId, "type", type, "message", message),
                    String.class);
        } catch (Exception ignored) {
            // best effort
        }
    }
}
