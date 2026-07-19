package com.studysync.tutoring.service;
import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.exception.BadRequestException;
import com.studysync.tutoring.exception.NotFoundException;
import com.studysync.tutoring.vetting.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class VettingService {
    private static final double DEFAULT_HOURLY_RATE = 50.0;
    private final TutorApplicationRepository apps;
    private final TestAttemptRepository attempts;
    private final AdminReviewRepository reviews;

    public VettingService(TutorApplicationRepository apps, TestAttemptRepository attempts, AdminReviewRepository reviews) {
        this.apps = apps; this.attempts = attempts; this.reviews = reviews;
    }

    @Transactional
    public ApplicationResponse apply(ApplyRequest req) {
        if (apps.existsByUserIdAndCourseId(req.userId(), req.courseId())) throw new BadRequestException("already applied");
        TutorApplication a = new TutorApplication();
        a.setUserId(req.userId()); a.setCourseId(req.courseId());
        a.setStatus(ApplicationStatus.PENDING_TEST); a.setAttemptsUsed(0);
        apps.save(a);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public ApplicationResponse get(UUID applicationId) { return toResponse(load(applicationId)); }

    @Transactional
    public AttemptResult submit(UUID applicationId, SubmitAttemptRequest req) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.PENDING_TEST) throw new BadRequestException("no test available");
        int next = a.getAttemptsUsed() + 1;
        TestAttempt at = new TestAttempt();
        at.setApplicationId(a.getApplicationId()); at.setSetLabel("A"); at.setAttemptNumber(next);
        at.setScorePct(100.0); at.setPassed(true);
        attempts.save(at);
        a.setAttemptsUsed(next);
        a.setStatus(ApplicationStatus.UNDER_REVIEW);
        apps.save(a);
        return new AttemptResult(100.0, true, a.getStatus().name(), a.getAttemptsUsed(), "submitted for review");
    }

    @Transactional
    public ApplicationResponse attachDocument(UUID applicationId, String ref) {
        TutorApplication a = load(applicationId);
        if (a.getDocumentRef() == null || a.getDocumentRef().isEmpty()) a.setDocumentRef(ref);
        else a.setDocumentRef(a.getDocumentRef() + "," + ref);
        apps.save(a);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> listByUser(String userId) { return apps.findByUserId(userId).stream().map(this::toResponse).toList(); }
    public List<ApplicationResponse> queue(ApplicationStatus status) { return apps.findByStatus(status).stream().map(this::toResponse).toList(); }

    @Transactional
    public ApplicationResponse decide(UUID applicationId, boolean approve, DecisionRequest req) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.UNDER_REVIEW) throw new BadRequestException("not awaiting review");
        a.setStatus(approve ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED);
        if (approve) a.setHourlyRate(DEFAULT_HOURLY_RATE);
        apps.save(a);
        AdminReview r = new AdminReview();
        r.setApplicationId(a.getApplicationId()); r.setAdminId(req.adminId()); r.setDecision(a.getStatus().name()); r.setNotes(req.notes());
        reviews.save(r);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public List<String> approvedTutors(String courseId) { return apps.findByStatusAndCourseId(ApplicationStatus.APPROVED, courseId).stream().map(TutorApplication::getUserId).distinct().toList(); }
    private TutorApplication load(UUID id) { return apps.findById(id).orElseThrow(() -> new NotFoundException("not found")); }
    private ApplicationResponse toResponse(TutorApplication a) { return new ApplicationResponse(a.getApplicationId().toString(), a.getUserId(), a.getCourseId(), a.getStatus().name(), a.getAttemptsUsed(), a.getDocumentRef()); }
}