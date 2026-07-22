package com.studysync.payment.web;

import com.studysync.payment.PaymentStatus;
import com.studysync.payment.PaymentTransaction;
import com.studysync.payment.PaymentTransactionRepository;
import com.studysync.payment.dto.RevenueSummary;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/payments/revenue")
public class RevenueController {

    private final PaymentTransactionRepository repository;

    public RevenueController(PaymentTransactionRepository repository) {
        this.repository = repository;
    }

    // Total Pro subscription revenue (dev/admin view). Full amount goes to the platform.
    @GetMapping("/pro")
    public RevenueSummary proRevenue() {
        List<PaymentTransaction> txs = repository.findByPurposeAndStatus("pro_subscription", PaymentStatus.SUCCESS);
        long total = txs.stream().mapToLong(PaymentTransaction::getAmountKobo).sum();
        return new RevenueSummary(txs.size(), total, "pro_subscription");
    }
}
