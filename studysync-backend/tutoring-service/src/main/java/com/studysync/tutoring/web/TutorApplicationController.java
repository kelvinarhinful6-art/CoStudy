package com.studysync.tutoring.web;
import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.service.VettingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/tutor-applications")
public class TutorApplicationController {
    private final VettingService service;
    public TutorApplicationController(VettingService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse apply(@Valid @RequestBody ApplyRequest req) { return service.apply(req); }

    @GetMapping
    public java.util.List<ApplicationResponse> mine(@RequestParam String userId) { return service.listByUser(userId); }
    
    @GetMapping("/{id}")
    public ApplicationResponse get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping("/{id}/attempts")
    public AttemptResult submit(@PathVariable UUID id, @Valid @RequestBody SubmitAttemptRequest req) { return service.submit(id, req); }

    @PostMapping("/{id}/upload")
    public ApplicationResponse upload(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) throw new com.studysync.tutoring.exception.BadRequestException("no file provided");
        try {
            Path dir = Paths.get("/app/uploads");
            Files.createDirectories(dir);
            String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
            String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
            String stored = id + "_" + safe;
            Files.copy(file.getInputStream(), dir.resolve(stored), StandardCopyOption.REPLACE_EXISTING);
            return service.attachDocument(id, stored);
        } catch (IOException e) { throw new com.studysync.tutoring.exception.BadRequestException("could not save file"); }
    }

    @GetMapping("/documents/{filename}")
    public org.springframework.core.io.Resource downloadDocument(@PathVariable String filename) {
        try {
            Path file = Paths.get("/app/uploads").resolve(filename);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(file.toUri());
            if (!resource.exists()) throw new com.studysync.tutoring.exception.NotFoundException("file not found");
            return resource;
        } catch (Exception e) { throw new com.studysync.tutoring.exception.NotFoundException("file not found"); }
    }
}