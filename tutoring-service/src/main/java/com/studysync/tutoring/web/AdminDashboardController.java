package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.AdminDashboardDTOs.*;
import com.studysync.tutoring.service.AdminDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping("/tutors")
    public List<TutorSummaryDto> getTutors() {
        return adminDashboardService.getTutorDashboardList();
    }

    @GetMapping("/tutors/{tutorId}")
    public TutorDetailDto getTutorDetail(@PathVariable String tutorId) {
        return adminDashboardService.getTutorDetail(tutorId);
    }

    @PostMapping("/tutors/{tutorId}/mark-paid")
    public TutorDetailDto markPaid(@PathVariable String tutorId, @RequestBody(required = false) MarkPaidRequest request) {
        String periodLabel = (request != null) ? request.periodLabel() : "Monthly Payout";
        return adminDashboardService.markTutorPaid(tutorId, periodLabel);
    }

    @GetMapping("/summary")
    public PlatformSummaryDto getSummary() {
        return adminDashboardService.getPlatformSummary();
    }
}
