package com.studysync.tutoring.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByTutorId(String tutorId);
    List<Review> findByBookingId(UUID bookingId);
    boolean existsByBookingId(UUID bookingId);
}
