package com.studysync.learning.study;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StudyTaskRepository extends JpaRepository<StudyTask, UUID> {
    List<StudyTask> findByUserIdOrderByDeadlineAsc(String userId);
}