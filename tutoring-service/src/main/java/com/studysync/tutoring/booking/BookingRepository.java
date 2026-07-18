package com.studysync.tutoring.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByStudentId(String studentId);
    List<Booking> findByTutorId(String tutorId);
}
