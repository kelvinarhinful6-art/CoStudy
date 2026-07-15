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

    private static final double PASS_MARK = 95.0;   // must score >= 95%
    private static final int MAX_ATTEMPTS = 3;       // 3 attempts, sets A/B/C
    private static final double DEFAULT_HOURLY_RATE = 50.0; // same rate for every approved tutor

    private final TutorApplicationRepository apps;
    private final QuestionSetRepository sets;
    private final QuestionRepository questions;
    private final TestAttemptRepository attempts;
    private final AdminReviewRepository reviews;

    public VettingService(TutorApplicationRepository apps, QuestionSetRepository sets,
                          QuestionRepository questions, TestAttemptRepository attempts,
                          AdminReviewRepository reviews) {
        this.apps = apps; this.sets = sets; this.questions = questions;
        this.attempts = attempts; this.reviews = reviews;
    }

    private String labelFor(int attemptNumber) {
        return switch (attemptNumber) { case 1 -> "A"; case 2 -> "B"; default -> "C"; };
    }

    // --- Applicant flow ---

    @Transactional
    public ApplicationResponse apply(ApplyRequest req) {
        if (apps.existsByUserIdAndCourseId(req.userId(), req.courseId())) {
            throw new BadRequestException("you have already applied to tutor this course");
        }
        if (sets.findByCourseIdAndSetLabel(req.courseId(), "A").isEmpty()) {
            throw new BadRequestException("tutor applications are not currently available for this course");
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

    // Serve the question set for the next attempt (without correct answers).
    @Transactional(readOnly = true)
    public QuestionSetView getQuestions(UUID applicationId) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.PENDING_TEST) {
            throw new BadRequestException("no test available (status: " + a.getStatus() + ")");
        }
        int next = a.getAttemptsUsed() + 1;
        String label = labelFor(next);
        QuestionSet set = sets.findByCourseIdAndSetLabel(a.getCourseId(), label)
                .orElseThrow(() -> new BadRequestException(
                        "no question set '" + label + "' configured for course " + a.getCourseId()));
        List<QuestionView> qv = questions.findBySetId(set.getSetId()).stream()
                .map(q -> new QuestionView(q.getQuestionId().toString(), q.getPrompt(),
                        q.getOptionA(), q.getOptionB(), q.getOptionC(), q.getOptionD()))
                .toList();
        return new QuestionSetView(label, next, qv);
    }

    // Grade an attempt and move the application forward.
    @Transactional
    public AttemptResult submit(UUID applicationId, SubmitAttemptRequest req) {
        TutorApplication a = load(applicationId);
        if (a.getStatus() != ApplicationStatus.PENDING_TEST) {
            throw new BadRequestException("no test available (status: " + a.getStatus() + ")");
        }
        int next = a.getAttemptsUsed() + 1;
        String label = labelFor(next);
        QuestionSet set = sets.findByCourseIdAndSetLabel(a.getCourseId(), label)
                .orElseThrow(() -> new BadRequestException(
                        "no question set '" + label + "' configured for course " + a.getCourseId()));

        List<Question> qs = questions.findBySetId(set.getSetId());
        Map<String, String> correct = qs.stream()
                .collect(Collectors.toMap(q -> q.getQuestionId().toString(), Question::getCorrectOption));

        long right = 0;
        for (AnswerDto ans : req.answers()) {
            String c = correct.get(ans.questionId());
            if (c != null && c.equalsIgnoreCase(ans.chosenOption())) right++;
        }
        double score = qs.isEmpty() ? 0.0 : (right * 100.0 / qs.size());
        boolean passed = score >= PASS_MARK;

        TestAttempt at = new TestAttempt();
        at.setApplicationId(a.getApplicationId());
        at.setSetLabel(label);
        at.setAttemptNumber(next);
        at.setScorePct(score);
        at.setPassed(passed);
        attempts.save(at);

        a.setAttemptsUsed(next);
        String message;
        if (passed) {
            a.setStatus(ApplicationStatus.UNDER_REVIEW);
            message = "passed - sent to admin for review";
        } else if (a.getAttemptsUsed() >= MAX_ATTEMPTS) {
            a.setStatus(ApplicationStatus.LOCKED_OUT);
            message = "failed all " + MAX_ATTEMPTS + " attempts - locked out for this course";
        } else {
            message = "failed (need " + PASS_MARK + "%) - you may try again with a new set";
        }
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

    // --- Admin flow ---

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

    @Transactional
    public void createQuestionSet(CreateQuestionSetRequest req) {
        if (sets.findByCourseIdAndSetLabel(req.courseId(), req.setLabel()).isPresent()) {
            throw new BadRequestException("set '" + req.setLabel() + "' already exists for this course");
        }
        QuestionSet set = new QuestionSet();
        set.setCourseId(req.courseId());
        set.setSetLabel(req.setLabel());
        sets.save(set);
        for (NewQuestion nq : req.questions()) {
            Question q = new Question();
            q.setSetId(set.getSetId());
            q.setPrompt(nq.prompt());
            q.setOptionA(nq.optionA()); q.setOptionB(nq.optionB());
            q.setOptionC(nq.optionC()); q.setOptionD(nq.optionD());
            q.setCorrectOption(nq.correctOption());
            questions.save(q);
        }
    }

    // Only APPROVED tutors are visible.
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
