package com.studysync.tutoring.service;

import com.studysync.tutoring.booking.*;
import com.studysync.tutoring.dto.CreateReviewRequest;
import com.studysync.tutoring.dto.ReviewResponse;
import com.studysync.tutoring.dto.TutorReviews;
import com.studysync.tutoring.exception.BadRequestException;
import com.studysync.tutoring.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviews;
    private final BookingRepository bookings;

    public ReviewService(ReviewRepository reviews, BookingRepository bookings) {
        this.reviews = reviews; this.bookings = bookings;
    }

    // A student reviews a tutor, only after a completed session. Idempotent per booking.
    @Transactional
    public ReviewResponse create(CreateReviewRequest req) {
        UUID bookingId;
        try { bookingId = UUID.fromString(req.bookingId()); }
        catch (IllegalArgumentException e) { throw new BadRequestException("invalid bookingId"); }

        Booking b = bookings.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("booking not found"));
        if (b.getStatus() != BookingStatus.COMPLETED) {
            throw new BadRequestException("you can only review a completed session");
        }
        // Prevent duplicate reviews for the same booking.
        if (reviews.existsByBookingId(bookingId)) {
            return reviews.findByBookingId(bookingId).stream()
                    .findFirst()
                    .map(this::toResponse)
                    .orElseThrow(() -> new NotFoundException("review not found"));
        }
        Review r = new Review();
        r.setBookingId(b.getBookingId());
        r.setStudentId(b.getStudentId());
        r.setTutorId(b.getTutorId());
        r.setCourseId(b.getCourseId());
        r.setRating(req.rating());
        r.setComment(req.comment());
        reviews.save(r);
        return toResponse(r);
    }

    @Transactional(readOnly = true)
    public TutorReviews forTutor(String tutorId) {
        List<Review> list = reviews.findByTutorId(tutorId);
        double avg = list.isEmpty() ? 0.0
                : Math.round(list.stream().mapToInt(Review::getRating).average().orElse(0) * 100.0) / 100.0;
        List<ReviewResponse> mapped = list.stream().map(this::toResponse).toList();
        return new TutorReviews(tutorId, avg, list.size(), mapped);
    }

    private ReviewResponse toResponse(Review r) {
        return new ReviewResponse(r.getReviewId().toString(), r.getTutorId(), r.getStudentId(),
                r.getCourseId(), r.getBookingId().toString(), r.getRating(), r.getComment(),
                r.getCreatedAt().toString());
    }
}
