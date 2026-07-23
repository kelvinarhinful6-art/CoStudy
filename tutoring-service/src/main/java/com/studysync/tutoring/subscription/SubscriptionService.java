package com.studysync.tutoring.subscription;

import com.studysync.tutoring.dto.PlanResponse;
import com.studysync.tutoring.dto.SubscriptionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

import com.studysync.tutoring.client.NotificationClient;

@Service
public class SubscriptionService {

    private final SubscriptionRepository repo;
    private final NotificationClient notificationClient;
    private final double proPrice;
    private final String currency;
    private final int proMonths;

    public SubscriptionService(SubscriptionRepository repo,
                               NotificationClient notificationClient,
                               @Value("${billing.pro.price:49.99}") double proPrice,
                               @Value("${billing.pro.currency:GHS}") String currency,
                               @Value("${billing.pro.months:1}") int proMonths) {
        this.repo = repo;
        this.notificationClient = notificationClient;
        this.proPrice = proPrice;
        this.currency = currency;
        this.proMonths = proMonths;
    }

    public PlanResponse plan() {
        return new PlanResponse(proPrice, currency, proMonths);
    }

    // True only if the user has an active (non-expired) Pro plan.
    @Transactional(readOnly = true)
    public boolean isPro(String userId) {
        return repo.findByUserId(userId).map(this::activePro).orElse(false);
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse status(String userId) {
        return repo.findByUserId(userId).map(this::toResponse)
                .orElse(new SubscriptionResponse(userId, "FREE", false, null));
    }

    // Simulated payment -> grant Pro for the configured number of months.
    @Transactional
    public SubscriptionResponse subscribePro(String userId) {
        Subscription s = repo.findByUserId(userId).orElseGet(() -> {
            Subscription n = new Subscription();
            n.setUserId(userId);
            return n;
        });
        Instant now = Instant.now();
        s.setTier(Tier.PRO);
        s.setStartedAt(now);
        s.setExpiresAt(now.plus(Duration.ofDays(30L * proMonths)));
        repo.save(s);

        notificationClient.notify(userId, "PRO_ACTIVATED",
                "Welcome to CoStudy Pro! You now have access to all premium features.");

        return toResponse(s);
    }

    @Transactional
    public SubscriptionResponse cancel(String userId) {
        Subscription s = repo.findByUserId(userId).orElseGet(() -> {
            Subscription n = new Subscription();
            n.setUserId(userId);
            return n;
        });
        s.setTier(Tier.FREE);
        s.setExpiresAt(null);
        repo.save(s);
        return toResponse(s);
    }

    private boolean activePro(Subscription s) {
        return s.getTier() == Tier.PRO
                && (s.getExpiresAt() == null || s.getExpiresAt().isAfter(Instant.now()));
    }

    private SubscriptionResponse toResponse(Subscription s) {
        boolean active = activePro(s);
        return new SubscriptionResponse(
                s.getUserId(),
                active ? "PRO" : "FREE",
                active,
                s.getExpiresAt() == null ? null : s.getExpiresAt().toString());
    }
}
