package com.studysync.tutoring.web;
import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.service.VettingService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @PostMapping("/{id}/submit")
    public ApplicationResponse submitApplication(@PathVariable UUID id) { return service.submitApplication(id); }

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
    public ResponseEntity<Resource> downloadDocument(@PathVariable String filename) {
        try {
            Path file = Paths.get("/app/uploads").resolve(filename).normalize();
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) throw new com.studysync.tutoring.exception.NotFoundException("file not found");
            String contentType = contentTypeFor(filename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (Exception e) { throw new com.studysync.tutoring.exception.NotFoundException("file not found"); }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @RequestParam String userId) {
        service.withdraw(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/resign")
    public ApplicationResponse resign(@PathVariable UUID id, @RequestBody ResignRequest req) {
        return service.resign(id, req.userId());
    }

    private static String contentTypeFor(String filename) {
        int dot = filename.lastIndexOf('.');
        String ext = dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
        return switch (ext) {
            case "pdf" -> "application/pdf";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "bmp" -> "image/bmp";
            case "txt" -> "text/plain; charset=utf-8";
            case "csv" -> "text/csv; charset=utf-8";
            case "html", "htm" -> "text/html; charset=utf-8";
            case "json" -> "application/json";
            case "xml" -> "application/xml";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xls" -> "application/vnd.ms-excel";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "ppt" -> "application/vnd.ms-powerpoint";
            case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "mp4" -> "video/mp4";
            case "mp3" -> "audio/mpeg";
            case "zip" -> "application/zip";
            default -> "application/octet-stream";
        };
    }
}