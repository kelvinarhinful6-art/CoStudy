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
    // How many times the same user may apply for the same course (incl. re-applies after rejection).
    private static final int MAX_APPLICATIONS_PER_COURSE = 3;
    private final TutorApplicationRepository apps;
    private final AdminReviewRepository reviews;

    public VettingService(TutorApplicationRepository apps, AdminReviewRepository reviews) {
        this.apps = apps; this.reviews = reviews;
    }

    @Transactional
    public ApplicationResponse apply(ApplyRequest req) {
        List<TutorApplication> existing = apps.findByUserIdAndCourseId(req.userId(), req.courseId());
        // Block only while an application is still open (don't create duplicate in-progress apps).
        boolean inProgress = existing.stream().anyMatch(a ->
                a.getStatus() == ApplicationStatus.AWAITING_DOCUMENTS
                || a.getStatus() == ApplicationStatus.UNDER_REVIEW);
        if (inProgress) throw new BadRequestException("You already have an application in progress for this course");
        // Allow re-applying (e.g. after a rejection), but cap the total number of attempts.
        if (existing.size() >= MAX_APPLICATIONS_PER_COURSE) {
            throw new BadRequestException("You can only apply for this course up to " + MAX_APPLICATIONS_PER_COURSE + " times");
        }
        // Documents-only process for every course: download the assessment PDF,
        // solve it, and upload it with CV / transcript for manual admin review.
        TutorApplication a = new TutorApplication();
        a.setUserId(req.userId()); a.setCourseId(req.courseId());
        a.setRegisteredCourse(false);
        a.setStatus(ApplicationStatus.AWAITING_DOCUMENTS);
        a.setAttemptsUsed(0);
        apps.save(a);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public ApplicationResponse get(UUID applicationId) { return toResponse(load(applicationId)); }

    @Transactional
    public ApplicationResponse submitApplication(UUID applicationId) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.AWAITING_DOCUMENTS) {
            throw new BadRequestException("application is not awaiting documents");
        }
        if (a.getDocumentRef() == null || a.getDocumentRef().isEmpty()) {
            throw new BadRequestException("upload a document before submitting");
        }
        a.setStatus(ApplicationStatus.UNDER_REVIEW);
        apps.save(a);
        return toResponse(a);
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

    // Applicant withdraws their own in-progress application (not yet decided by admin).
    @Transactional
    public void withdraw(UUID applicationId, String userId) {
        TutorApplication a = load(applicationId);
        if (!a.getUserId().equals(userId)) throw new NotFoundException("not found");
        if (a.getStatus() == ApplicationStatus.APPROVED || a.getStatus() == ApplicationStatus.REJECTED)
            throw new BadRequestException("Only pending applications can be withdrawn");
        String ref = a.getDocumentRef();
        apps.delete(a);
        // Best-effort cleanup of the uploaded document file.
        if (ref != null && !ref.isEmpty()) {
            try { java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get("/app/uploads").resolve(ref).normalize()); }
            catch (Exception ignored) {}
        }
    }

    // Approved tutor voluntarily resigns; moves the application out of APPROVED so they
    // are no longer returned by approvedTutors (not bookable / visible as a tutor).
    @Transactional
    public ApplicationResponse resign(UUID applicationId, String userId) {
        TutorApplication a = load(applicationId);
        if (!a.getUserId().equals(userId)) throw new NotFoundException("not found");
        if (a.getStatus() != ApplicationStatus.APPROVED)
            throw new BadRequestException("You are not an approved tutor for this application");
        a.setStatus(ApplicationStatus.RESIGNED);
        a.setHourlyRate(null);
        apps.save(a);
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public List<String> approvedTutors(String courseId) { return apps.findByStatusAndCourseId(ApplicationStatus.APPROVED, courseId).stream().map(TutorApplication::getUserId).distinct().toList(); }

    private TutorApplication load(UUID id) { return apps.findById(id).orElseThrow(() -> new NotFoundException("not found")); }
    private ApplicationResponse toResponse(TutorApplication a) { return new ApplicationResponse(a.getApplicationId().toString(), a.getUserId(), a.getCourseId(), a.getStatus().name(), a.getAttemptsUsed(), a.getDocumentRef(), Boolean.TRUE.equals(a.isRegisteredCourse())); }
}
