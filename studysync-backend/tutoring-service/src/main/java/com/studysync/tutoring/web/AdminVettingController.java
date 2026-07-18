package com.studysync.tutoring.web;

import com.studysync.tutoring.vetting.VettingQuestion;
import com.studysync.tutoring.vetting.VettingQuestionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/questions")
public class AdminVettingController {
    private final VettingQuestionRepository repo;

    public AdminVettingController(VettingQuestionRepository repo) {
        this.repo = repo;
    }

    // Get all questions (for admin management)
    @GetMapping
    public List<VettingQuestion> getAllQuestions() {
        return repo.findAll();
    }

    // Get active questions (used when tutor is taking the test)
    @GetMapping("/active")
    public List<VettingQuestion> getActiveQuestions() {
        return repo.findByIsActiveTrue();
    }

    // Create a new question
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VettingQuestion createQuestion(@RequestBody QuestionRequest req) {
        VettingQuestion q = new VettingQuestion();
        q.setQuestionText(req.text());
        q.setActive(req.active() != null ? req.active() : true);
        return repo.save(q);
    }

    // Edit a question
    @PutMapping("/{id}")
    public VettingQuestion updateQuestion(@PathVariable UUID id, @RequestBody QuestionRequest req) {
        VettingQuestion q = repo.findById(id).orElseThrow();
        if (req.text() != null) q.setQuestionText(req.text());
        if (req.active() != null) q.setActive(req.active());
        return repo.save(q);
    }

    // Delete a question
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuestion(@PathVariable UUID id) {
        repo.deleteById(id);
    }

    public record QuestionRequest(String text, Boolean active) {}
}