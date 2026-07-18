package com.studysync.learning.web;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/learning")
public class PingController {
    @GetMapping("/ping")
    public Map<String, Object> ping() {
        return Map.of("service", "learning-service", "status", "alive",
                "time", Instant.now().toString());
    }
}
