package com.studysync.tutoring.vetting;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TutorApplicationRepository extends JpaRepository<TutorApplication, UUID> {
    boolean existsByUserIdAndCourseId(String userId, String courseId);
    Optional<TutorApplication> findByUserIdAndCourseId(String userId, String courseId);
    List<TutorApplication> findByUserId(String userId);
    List<TutorApplication> findByStatus(ApplicationStatus status);
    List<TutorApplication> findByStatusAndCourseId(ApplicationStatus status, String courseId);
}
