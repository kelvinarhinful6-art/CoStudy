package com.studysync.engagement.web;

import com.studysync.engagement.ads.AdService;
import com.studysync.engagement.dto.AdResponse;
import com.studysync.engagement.dto.CreateAdRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/ads")
public class AdController {

    private final AdService service;
    public AdController(AdService service) { this.service = service; }

    @PostMapping                                  // seed an ad
    @ResponseStatus(HttpStatus.CREATED)
    public AdResponse create(@Valid @RequestBody CreateAdRequest req) {
        return service.create(req);
    }

    // Next ad for a free user (<=1/hr). Empty body if not eligible yet.
    @GetMapping("/next")
    public AdResponse next(@RequestParam String userId) {
        return service.next(userId);
    }

    @GetMapping("/ping")
    public Map<String, Object> ping() {
        return Map.of("service", "engagement-service", "status", "alive",
                "time", Instant.now().toString());
    }
}
