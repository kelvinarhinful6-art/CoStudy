package com.studysync.learning.group;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StudyGroupRepository extends JpaRepository<StudyGroup, UUID> {
    List<StudyGroup> findByCourseId(String courseId);
    long countByCreatedBy(String createdBy);
}
