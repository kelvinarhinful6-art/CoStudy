package com.studysync.engagement.ads;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AdImpressionRepository extends JpaRepository<AdImpression, UUID> {
    Optional<AdImpression> findTopByUserIdOrderByShownAtDesc(String userId);
}
