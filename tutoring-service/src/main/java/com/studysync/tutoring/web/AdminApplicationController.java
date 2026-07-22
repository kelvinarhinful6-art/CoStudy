package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.ApplicationResponse;
import com.studysync.tutoring.dto.DecisionRequest;
import com.studysync.tutoring.service.VettingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/tutor-applications")
public class AdminApplicationController {
    private final VettingService service;
    public AdminApplicationController(VettingService service) { this.service = service; }

    @GetMapping
    public List<ApplicationResponse> queue(@RequestParam String status) {
        return service.queue(com.studysync.tutoring.vetting.ApplicationStatus.valueOf(status));
    }

    @PatchMapping("/{id}/approve")
    public ApplicationResponse approve(@PathVariable UUID id, @RequestBody DecisionRequest req) {
        return service.decide(id, true, req);
    }

    @PatchMapping("/{id}/decline")
    public ApplicationResponse decline(@PathVariable UUID id, @RequestBody DecisionRequest req) {
        return service.decide(id, false, req);
    }
}