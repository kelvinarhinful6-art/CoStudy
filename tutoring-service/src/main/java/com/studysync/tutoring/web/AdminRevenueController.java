package com.studysync.tutoring.web;

import com.studysync.tutoring.dto.RevenueResponse;
import com.studysync.tutoring.service.BookingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/revenue")
public class AdminRevenueController {

    private final BookingService bookings;

    public AdminRevenueController(BookingService bookings) {
        this.bookings = bookings;
    }

    // Total tutoring-session revenue kept by the platform (dev/admin view).
    @GetMapping("/tutoring")
    public RevenueResponse tutoringRevenue() {
        return bookings.revenue();
    }
}
