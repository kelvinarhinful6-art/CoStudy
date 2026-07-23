package com.studysync.tutoring.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TutorPayoutRepository extends JpaRepository<TutorPayout, UUID> {
    List<TutorPayout> findByTutorIdOrderByPaidAtDesc(String tutorId);
    List<TutorPayout> findByTutorId(String tutorId);
}
