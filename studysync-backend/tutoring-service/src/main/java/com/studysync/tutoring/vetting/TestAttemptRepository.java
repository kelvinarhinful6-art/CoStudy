package com.studysync.tutoring.vetting;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TestAttemptRepository extends JpaRepository<TestAttempt, UUID> {
}
