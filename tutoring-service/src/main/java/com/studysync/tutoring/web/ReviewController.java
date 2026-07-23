package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.CreateReviewRequest;
import com.studysync.tutoring.dto.ReviewResponse;
import com.studysync.tutoring.dto.UpdateReviewRequest;
import com.studysync.tutoring.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService service;
    public ReviewController(ReviewService service) { this.service = service; }

    @PostMapping                                  // review after a completed session
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse create(@Valid @RequestBody CreateReviewRequest req) {
        return service.create(req);
    }

    @PutMapping("/{reviewId}")
    public ReviewResponse update(@PathVariable UUID reviewId, @Valid @RequestBody UpdateReviewRequest req) {
        return service.update(reviewId, req);
    }

    @DeleteMapping("/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID reviewId, @RequestParam(required = false) String requestedBy) {
        service.delete(reviewId, requestedBy);
    }
}

