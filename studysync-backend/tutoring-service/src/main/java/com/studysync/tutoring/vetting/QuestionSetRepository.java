package com.studysync.tutoring.vetting;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionSetRepository extends JpaRepository<QuestionSet, UUID> {
    Optional<QuestionSet> findByCourseIdAndSetLabel(String courseId, String setLabel);
    List<QuestionSet> findByCourseId(String courseId);
}
