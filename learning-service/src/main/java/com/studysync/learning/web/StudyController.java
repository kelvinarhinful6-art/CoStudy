package com.studysync.learning.web;

import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.study.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
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
        StudyTask t = taskRepo.findById(id).orElseThrow(() -> new NotFoundException("Task not found: " + id));
        t.setCompleted(!t.isCompleted());
        return taskRepo.save(t);
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable UUID id) {
        if (!taskRepo.existsById(id)) {
            throw new NotFoundException("Task not found: " + id);
        }
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

    // Weekly / N-day productivity: total minutes + a per-day bucket for charting.
    @GetMapping("/analytics")
    public AnalyticsResponse analytics(@RequestParam String userId,
                                       @RequestParam(defaultValue = "7") int days) {
        if (days <= 0 || days > 90) days = 7;
        Instant from = Instant.now().minus(Duration.ofDays(days));
        List<StudySession> sessions = sessionRepo.findByUserIdAndSessionDateAfterOrderBySessionDateAsc(userId, from);

        // Bucket by local date (UTC day). Pre-fill every day so the chart has no gaps.
        ZoneId zone = ZoneOffset.UTC;
        Map<LocalDate, int[]> buckets = new LinkedHashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = LocalDate.now(zone).minusDays(i);
            buckets.put(d, new int[2]); // [minutes, sessions]
        }
        int totalMinutes = 0;
        for (StudySession s : sessions) {
            LocalDate d = s.getSessionDate().atZone(zone).toLocalDate();
            int[] acc = buckets.computeIfAbsent(d, k -> new int[2]);
            acc[0] += s.getDurationMinutes();
            acc[1] += 1;
            totalMinutes += s.getDurationMinutes();
        }
        List<DayBucket> byDay = buckets.entrySet().stream()
                .map(e -> new DayBucket(e.getKey().toString(), e.getValue()[0], e.getValue()[1]))
                .toList();
        return new AnalyticsResponse(totalMinutes, sessions.size(), byDay);
    }

    public record TaskRequest(String userId, String title, String subject, String deadline) {}
    public record SessionRequest(String userId, String subject, int minutes) {}
    public record DayBucket(String date, int minutes, int sessions) {}
    public record AnalyticsResponse(int totalMinutes, int totalSessions, List<DayBucket> byDay) {}
}