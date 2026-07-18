package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.CreateReviewRequest;
import com.studysync.tutoring.dto.ReviewResponse;
import com.studysync.tutoring.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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
}
