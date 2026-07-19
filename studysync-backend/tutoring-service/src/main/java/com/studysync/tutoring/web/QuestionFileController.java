package com.studysync.tutoring.web;

import com.studysync.tutoring.file.CourseQuestionFile;
import com.studysync.tutoring.file.CourseQuestionFileRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
public class QuestionFileController {
    private final CourseQuestionFileRepository repo;
    private final Path uploadDir = Paths.get("/app/uploads/questions");

    public QuestionFileController(CourseQuestionFileRepository repo) {
        this.repo = repo;
        try { Files.createDirectories(uploadDir); } catch (IOException e) {}
    }

    @PostMapping("/{courseId}/question-file")
    public CourseQuestionFile uploadQuestionFile(@PathVariable String courseId, @RequestParam("file") MultipartFile file) throws IOException {
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "questions.pdf";
        String safe = courseId.replaceAll("[^a-zA-Z0-9._-]", "_") + "_" + original;
        Files.copy(file.getInputStream(), uploadDir.resolve(safe), StandardCopyOption.REPLACE_EXISTING);
        String url = "/uploads/questions/" + safe;

        CourseQuestionFile qf = repo.findById(courseId).orElse(new CourseQuestionFile());
        qf.setCourseId(courseId);
        qf.setFileUrl(url);
        return repo.save(qf);
    }

    @GetMapping("/{courseId}/question-file")
    public ResponseEntity<?> getQuestionFile(@PathVariable String courseId) {
        return repo.findById(courseId)
            .map(qf -> ResponseEntity.ok(Map.of("url", qf.getFileUrl())))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/uploads/questions/{filename}")
    public ResponseEntity<Resource> serveQuestion(@PathVariable String filename) throws IOException {
        Path file = uploadDir.resolve(filename);
        Resource resource = new UrlResource(file.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();
        String contentType = Files.probeContentType(file);
        if (contentType == null) contentType = "application/octet-stream";
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_TYPE, contentType).body(resource);
    }
}