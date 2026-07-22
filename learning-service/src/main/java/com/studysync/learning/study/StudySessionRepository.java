package com.studysync.learning.study;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface StudySessionRepository extends JpaRepository<StudySession, UUID> {
    List<StudySession> findByUserIdOrderBySessionDateDesc(String userId);
    List<StudySession> findByUserIdAndSessionDateAfterOrderBySessionDateAsc(String userId, Instant from);
}