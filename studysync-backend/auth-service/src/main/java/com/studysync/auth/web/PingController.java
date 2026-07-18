package com.studysync.auth.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/** Simple liveness check: GET /api/auth/ping */
@RestController
@RequestMapping("/api/auth")
public class PingController {

    @GetMapping("/ping")
    public Map<String, Object> ping() {
        return Map.of(
                "service", "auth-service",
                "status", "alive",
                "time", Instant.now().toString()
        );
    }
}
