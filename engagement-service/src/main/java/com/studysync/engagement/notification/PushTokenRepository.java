package com.studysync.engagement.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushTokenRepository extends JpaRepository<PushToken, UUID> {
    List<PushToken> findByUserId(String userId);
    Optional<PushToken> findByToken(String token);
    void deleteByToken(String token);
}
