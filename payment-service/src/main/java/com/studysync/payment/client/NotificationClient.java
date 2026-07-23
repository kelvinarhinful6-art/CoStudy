package com.studysync.payment.client;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

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
            // best effort notification
        }
    }
}
