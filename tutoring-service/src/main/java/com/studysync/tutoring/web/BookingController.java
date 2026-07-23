package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.*;
import com.studysync.tutoring.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService service;
    public BookingController(BookingService service) { this.service = service; }

    @PostMapping                                  // student books a tutor (Pro-only)
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@Valid @RequestBody CreateBookingRequest req) {
        return service.create(req);
    }

    public record ConfirmPaymentRequest(String paymentReference) {}

    @PostMapping("/{id}/confirm-payment")
    public BookingResponse confirmPayment(@PathVariable UUID id, @RequestBody ConfirmPaymentRequest req) {
        return service.confirmPayment(id, req.paymentReference());
    }

    @GetMapping("/{id}")
    public BookingResponse get(@PathVariable UUID id) { return service.get(id); }

    @GetMapping                                   // ?studentId= or ?tutorId=
    public List<BookingResponse> list(@RequestParam(required = false) String studentId,
                                      @RequestParam(required = false) String tutorId) {
        if (studentId != null) return service.byStudent(studentId);
        if (tutorId != null) return service.byTutor(tutorId);
        return List.of();
    }

    @PostMapping("/{id}/complete")                // finish session -> simulated payment
    public BookingResponse complete(@PathVariable UUID id) { return service.complete(id); }

    @PutMapping("/{id}/link")                     // tutor posts the Zoom link
    public BookingResponse setLink(@PathVariable UUID id, @RequestBody LinkRequest req) {
        return service.setLink(id, req.zoomLink());
    }
    @PostMapping("/{id}/start")                    // tutor starts session -> notify both
    public BookingResponse start(@PathVariable UUID id) { return service.startSession(id); }
    @PostMapping("/{id}/end")                      // tutor ends session -> notify both
    public BookingResponse end(@PathVariable UUID id) { return service.endSession(id); }
    public record LinkRequest(String zoomLink) {}
    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(@PathVariable UUID id) { return service.cancel(id); }
    @DeleteMapping("/{bookingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBooking(@PathVariable UUID bookingId) {
        service.deleteBooking(bookingId);
    }
}
