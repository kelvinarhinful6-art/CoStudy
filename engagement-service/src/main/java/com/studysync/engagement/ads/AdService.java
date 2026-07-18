package com.studysync.engagement.ads;

import com.studysync.engagement.dto.AdResponse;
import com.studysync.engagement.dto.CreateAdRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class AdService {

    private final AdRepository ads;
    private final AdImpressionRepository impressions;

    public AdService(AdRepository ads, AdImpressionRepository impressions) {
        this.ads = ads; this.impressions = impressions;
    }

    @Transactional
    public AdResponse create(CreateAdRequest req) {
        Ad a = new Ad();
        a.setTitle(req.title());
        a.setBody(req.body());
        a.setActive(true);
        ads.save(a);
        return new AdResponse(a.getAdId().toString(), a.getTitle(), a.getBody());
    }

    // Free-tier rule: at most one ad per hour per user. Returns null if not yet eligible.
    @Transactional
    public AdResponse next(String userId) {
        List<Ad> active = ads.findByActiveTrue();
        if (active.isEmpty()) return null;

        var last = impressions.findTopByUserIdOrderByShownAtDesc(userId);
        if (last.isPresent() && last.get().getShownAt().isAfter(Instant.now().minus(Duration.ofHours(1)))) {
            return null;   // shown one within the last hour
        }

        Ad a = active.get(0);
        AdImpression imp = new AdImpression();
        imp.setUserId(userId);
        imp.setAdId(a.getAdId());
        impressions.save(imp);
        return new AdResponse(a.getAdId().toString(), a.getTitle(), a.getBody());
    }
}
