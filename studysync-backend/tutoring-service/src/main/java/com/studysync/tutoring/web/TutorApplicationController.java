package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.service.VettingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

// Applicant endpoints for tutor vetting.
@RestController
@RequestMapping("/api/tutor-applications")
public class TutorApplicationController {

    private final VettingService service;
    public TutorApplicationController(VettingService service) { this.service = service; }

    @PostMapping                                       // apply to tutor a course
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse apply(@Valid @RequestBody ApplyRequest req) {
        return service.apply(req);
    }

    @GetMapping                                        // list my applications
    public java.util.List<ApplicationResponse> mine(@RequestParam String userId) {
        return service.listByUser(userId);
    }
    @GetMapping("/{id}")                               // check status
    public ApplicationResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping("/{id}/questions")                     // get the test for this attempt
    public QuestionSetView questions(@PathVariable UUID id) {
        return service.getQuestions(id);
    }

    @PostMapping("/{id}/attempts")                     // submit answers, get graded
    public AttemptResult submit(@PathVariable UUID id, @Valid @RequestBody SubmitAttemptRequest req) {
        return service.submit(id, req);
    }

    @PostMapping("/{id}/documents")                    // attach a proof document reference (text)
    public ApplicationResponse document(@PathVariable UUID id, @Valid @RequestBody DocumentRequest req) {
        return service.attachDocument(id, req.documentRef());
    }

    // Real file upload: save the uploaded file and record its name on the application.
    @PostMapping("/{id}/upload")
    public ApplicationResponse upload(@PathVariable UUID id,
                                      @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new com.studysync.tutoring.exception.BadRequestException("no file provided");
        }
        try {
            Path dir = Paths.get("/app/uploads");
            Files.createDirectories(dir);
            String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
            String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
            String stored = id + "_" + safe;
            Files.copy(file.getInputStream(), dir.resolve(stored), StandardCopyOption.REPLACE_EXISTING);
            return service.attachDocument(id, stored);
        } catch (IOException e) {
            throw new com.studysync.tutoring.exception.BadRequestException("could not save file");
        }
    }
    @GetMapping("/documents/{filename}")
    public ResponseEntity<Resource> downloadDocument(@PathVariable String filename) {
        try {
            Path file = Paths.get("/app/uploads").resolve(filename);
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists()) throw new com.studysync.tutoring.exception.NotFoundException("file not found");
            String contentType = Files.probeContentType(file);
            if (contentType == null) contentType = "application/octet-stream";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (Exception e) {
            throw new com.studysync.tutoring.exception.NotFoundException("file not found");
        }
    }
}
