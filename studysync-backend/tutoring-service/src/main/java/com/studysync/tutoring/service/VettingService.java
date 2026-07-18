package com.studysync.tutoring.service;

import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.exception.BadRequestException;
import com.studysync.tutoring.exception.NotFoundException;
import com.studysync.tutoring.vetting.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class VettingService {

    private static final double DEFAULT_HOURLY_RATE = 50.0;

    private final TutorApplicationRepository apps;
    private final TestAttemptRepository attempts;
    private final AdminReviewRepository reviews;
    private final VettingQuestionRepository vettingQuestionRepo;

    public VettingService(TutorApplicationRepository apps, TestAttemptRepository attempts,
                          AdminReviewRepository reviews, VettingQuestionRepository vettingQuestionRepo) {
        this.apps = apps;
        this.attempts = attempts;
        this.reviews = reviews;
        this.vettingQuestionRepo = vettingQuestionRepo;
    }

    private String labelFor(int attemptNumber) {
        return switch (attemptNumber) { case 1 -> "A"; case 2 -> "B"; default -> "C"; };
    }

    @Transactional
    public ApplicationResponse apply(ApplyRequest req) {
        if (apps.existsByUserIdAndCourseId(req.userId(), req.courseId())) {
            throw new BadRequestException("you have already applied to tutor this course");
        }
        TutorApplication a = new TutorApplication();
        a.setUserId(req.userId());
        a.setCourseId(req.courseId());
        a.setStatus(ApplicationStatus.PENDING_TEST);
        a.setAttemptsUsed(0);
        apps.save(a);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public ApplicationResponse get(UUID applicationId) {
        return toResponse(load(applicationId));
    }

    @Transactional(readOnly = true)
    public QuestionSetView getQuestions(UUID applicationId) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.PENDING_TEST) {
            throw new BadRequestException("no test available (status: " + a.getStatus() + ")");
        }
        
        List<VettingQuestion> activeQuestions = vettingQuestionRepo.findByIsActiveTrue();
        if (activeQuestions.isEmpty()) {
            throw new BadRequestException("No active vetting questions configured by admin.");
        }
        
        int next = a.getAttemptsUsed() + 1;
        String label = labelFor(next);
        
        List<QuestionView> qv = activeQuestions.stream()
                .map(q -> new QuestionView(q.getQuestionId().toString(), q.getQuestionText(), "", "", "", ""))
                .toList();
        return new QuestionSetView(label, next, qv);
    }

    @Transactional
    public AttemptResult submit(UUID applicationId, SubmitAttemptRequest req) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.PENDING_TEST) {
            throw new BadRequestException("no test available (status: " + a.getStatus() + ")");
        }
        int next = a.getAttemptsUsed() + 1;
        String label = labelFor(next);

        // Since CMS questions are open-ended, we skip auto-grading.
        // We just save the attempt and move to admin review.
        double score = 100.0; 
        boolean passed = true; 

        TestAttempt at = new TestAttempt();
        at.setApplicationId(a.getApplicationId());
        at.setSetLabel(label);
        at.setAttemptNumber(next);
        at.setScorePct(score);
        at.setPassed(passed);
        attempts.save(at);

        a.setAttemptsUsed(next);
        String message = "submitted - sent to admin for review";
        
        a.setStatus(ApplicationStatus.UNDER_REVIEW);
        apps.save(a);
        return new AttemptResult(score, passed, a.getStatus().name(), a.getAttemptsUsed(), message);
    }

    @Transactional
    public ApplicationResponse attachDocument(UUID applicationId, String ref) {
        TutorApplication a = load(applicationId);
        a.setDocumentRef(ref);
        apps.save(a);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> listByUser(String userId) {
        return apps.findByUserId(userId).stream().map(this::toResponse).toList();
    }

    public List<ApplicationResponse> queue(ApplicationStatus status) {
        return apps.findByStatus(status).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ApplicationResponse decide(UUID applicationId, boolean approve, DecisionRequest req) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.UNDER_REVIEW) {
            throw new BadRequestException("application is not awaiting review (status: " + a.getStatus() + ")");
        }
        a.setStatus(approve ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED);
        if (approve) {
            a.setHourlyRate(DEFAULT_HOURLY_RATE);
        }
        apps.save(a);

        AdminReview r = new AdminReview();
        r.setApplicationId(a.getApplicationId());
        r.setAdminId(req.adminId());
        r.setDecision(a.getStatus().name());
        r.setNotes(req.notes());
        reviews.save(r);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public List<String> approvedTutors(String courseId) {
        return apps.findByStatusAndCourseId(ApplicationStatus.APPROVED, courseId).stream()
                .map(TutorApplication::getUserId).distinct().toList();
    }

    private TutorApplication load(UUID id) {
        return apps.findById(id).orElseThrow(() -> new NotFoundException("application not found"));
    }

    private ApplicationResponse toResponse(TutorApplication a) {
        return new ApplicationResponse(a.getApplicationId().toString(), a.getUserId(),
                a.getCourseId(), a.getStatus().name(), a.getAttemptsUsed(), a.getDocumentRef());
    }
}