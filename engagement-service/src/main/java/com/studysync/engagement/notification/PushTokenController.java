package com.studysync.engagement.notification;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class PushTokenController {

    private final PushTokenRepository repo;

    public PushTokenController(PushTokenRepository repo) {
        this.repo = repo;
    }

    // Register (or re-register) a device's Expo push token for a user.
    @PostMapping("/push-token")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterTokenRequest req) {
        repo.findByToken(req.token()).ifPresent(repo::delete); // upsert per device
        PushToken t = new PushToken();
        t.setUserId(req.userId());
        t.setToken(req.token());
        t.setPlatform(req.platform());
        repo.save(t);
    }

    // List a user's device tokens (used for debugging / direct sends).
    @GetMapping("/push-token")
    public List<String> tokens(@RequestParam String userId) {
        return repo.findByUserId(userId).stream().map(PushToken::getToken).toList();
    }

    // Unregister on logout / token refresh.
    @DeleteMapping("/push-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregister(@RequestBody RegisterTokenRequest req) {
        repo.deleteByToken(req.token());
    }

    public record RegisterTokenRequest(String userId, String token, String platform) {}
}
