package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.PlanResponse;
import com.studysync.tutoring.dto.SubscribeRequest;
import com.studysync.tutoring.dto.SubscriptionResponse;
import com.studysync.tutoring.subscription.SubscriptionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionService service;
    public SubscriptionController(SubscriptionService service) { this.service = service; }

    @GetMapping("/plan")                       // Pro price/currency for the app
    public PlanResponse plan() { return service.plan(); }

    @PostMapping                                // simulated Pro purchase
    public SubscriptionResponse subscribe(@Valid @RequestBody SubscribeRequest req) {
        return service.subscribePro(req.userId());
    }

    @GetMapping("/{userId}")                     // check a user's plan
    public SubscriptionResponse status(@PathVariable String userId) {
        return service.status(userId);
    }

    @PostMapping("/{userId}/cancel")             // downgrade to free
    public SubscriptionResponse cancel(@PathVariable String userId) {
        return service.cancel(userId);
    }
}
