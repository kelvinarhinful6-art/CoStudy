package com.studysync.engagement.notification;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Sends push notifications through Expo's Push API.
 * Best-effort: any failure is swallowed so notification delivery never breaks
 * the calling flow.
 */
@Service
public class ExpoPushService {

    private final RestTemplate rest = new RestTemplate();
    private static final String EXPO_URL = "https://exp.host/--/api/v2/push/send";

    public void send(String token, String title, String body) {
        if (token == null || token.isEmpty()) return;
        try {
            Map<String, Object> message = new LinkedHashMap<>();
            message.put("to", token);
            message.put("title", title);
            message.put("body", body);
            message.put("sound", "default");
            rest.postForEntity(EXPO_URL, message, String.class);
        } catch (Exception ignored) {
            // best effort
        }
    }
}
