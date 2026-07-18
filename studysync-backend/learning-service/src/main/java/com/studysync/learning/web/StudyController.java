package com.studysync.learning.web;

import com.studysync.learning.study.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/study")
public class StudyController {
    private final StudyTaskRepository taskRepo;
    private final StudySessionRepository sessionRepo;

    public StudyController(StudyTaskRepository taskRepo, StudySessionRepository sessionRepo) {
        this.taskRepo = taskRepo;
        this.sessionRepo = sessionRepo;
    }

    @GetMapping("/tasks")
    public List<StudyTask> getTasks(@RequestParam String userId) {
        return taskRepo.findByUserIdOrderByDeadlineAsc(userId);
    }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public StudyTask createTask(@RequestBody TaskRequest req) {
        StudyTask t = new StudyTask();
        t.setUserId(req.userId());
        t.setTitle(req.title());
        t.setSubject(req.subject());
        if (req.deadline() != null && !req.deadline().isEmpty()) {
            t.setDeadline(Instant.parse(req.deadline()));
        }
        return taskRepo.save(t);
    }

    @PutMapping("/tasks/{id}/toggle")
    public StudyTask toggleTask(@PathVariable UUID id) {
        StudyTask t = taskRepo.findById(id).orElseThrow();
        t.setCompleted(!t.isCompleted());
        return taskRepo.save(t);
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable UUID id) {
        taskRepo.deleteById(id);
    }

    @PostMapping("/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public StudySession logSession(@RequestBody SessionRequest req) {
        StudySession s = new StudySession();
        s.setUserId(req.userId());
        s.setSubject(req.subject());
        s.setDurationMinutes(req.minutes());
        return sessionRepo.save(s);
    }

    @GetMapping("/sessions")
    public List<StudySession> getSessions(@RequestParam String userId) {
        return sessionRepo.findByUserIdOrderBySessionDateDesc(userId);
    }

    public record TaskRequest(String userId, String title, String subject, String deadline) {}
    public record SessionRequest(String userId, String subject, int minutes) {}
}