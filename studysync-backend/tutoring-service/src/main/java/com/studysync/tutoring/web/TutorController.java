package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.exception.ForbiddenException;
import com.studysync.tutoring.service.BookingService;
import com.studysync.tutoring.service.ReviewService;
import com.studysync.tutoring.service.VettingService;
import com.studysync.tutoring.subscription.SubscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tutors")
public class TutorController {

    private final VettingService vetting;
    private final SubscriptionService subscriptions;
    private final BookingService bookings;
    private final ReviewService reviews;

    public TutorController(VettingService vetting, SubscriptionService subscriptions,
                           BookingService bookings, ReviewService reviews) {
        this.vetting = vetting; this.subscriptions = subscriptions;
        this.bookings = bookings; this.reviews = reviews;
    }

    // Browsing tutors is a Pro feature.
    @GetMapping
    public List<String> approved(@RequestParam String courseId, @RequestParam String userId) {
        if (!subscriptions.isPro(userId)) {
            throw new ForbiddenException("Pro subscription required to access tutors");
        }
        return vetting.approvedTutors(courseId);
    }

    // Tutor sets their hourly rate for an approved course.
    @PutMapping("/{tutorId}/rate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setRate(@PathVariable String tutorId, @Valid @RequestBody SetRateRequest req) {
        bookings.setRate(tutorId, req);
    }

    // A tutor's accumulated earnings (after platform commission).
    @GetMapping("/{tutorId}/earnings")
    public EarningsResponse earnings(@PathVariable String tutorId) {
        return bookings.earnings(tutorId);
    }

    // A tutor's reviews + average rating.
    @GetMapping("/{tutorId}/reviews")
    public TutorReviews tutorReviews(@PathVariable String tutorId) {
        return reviews.forTutor(tutorId);
    }

    @GetMapping("/ping")
    public Map<String, Object> ping() {
        return Map.of("service", "tutoring-service", "status", "alive",
                "time", Instant.now().toString());
    }
}
