package com.studysync.payment.web;

import com.studysync.payment.dto.InitiatePaymentRequest;
import com.studysync.payment.dto.InitiatePaymentResponse;
import com.studysync.payment.dto.VerifyPaymentResponse;
import com.studysync.payment.service.PaystackService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaystackService paystackService;

    public PaymentController(PaystackService paystackService) {
        this.paystackService = paystackService;
    }

    @PostMapping("/initiate")
    public InitiatePaymentResponse initiate(@Valid @RequestBody InitiatePaymentRequest request) {
        return paystackService.initiate(request);
    }

    @GetMapping("/verify/{reference}")
    public VerifyPaymentResponse verify(@PathVariable String reference) {
        return paystackService.verify(reference);
    }

    // TODO before going live: verify the x-paystack-signature HMAC header
    // against the raw payload using the secret key before trusting this.
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String payload,
                                         @RequestHeader(value = "x-paystack-signature", required = false) String signature) {
        return ResponseEntity.ok().build();
    }
}
