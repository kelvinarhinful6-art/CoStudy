package com.studysync.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByReference(String reference);
    List<PaymentTransaction> findByPurposeAndStatus(String purpose, com.studysync.payment.PaymentStatus status);
}
