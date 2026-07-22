package com.studysync.payment.service;

import com.studysync.payment.PaymentTransaction;
import com.studysync.payment.PaymentTransactionRepository;
import com.studysync.payment.dto.InitiatePaymentRequest;
import com.studysync.payment.dto.InitiatePaymentResponse;
import com.studysync.payment.dto.VerifyPaymentResponse;
import com.studysync.payment.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.Map;
import java.util.UUID;

@Service
public class PaystackService {

    private final WebClient paystackWebClient;
    private final PaymentTransactionRepository repository;

    public PaystackService(WebClient paystackWebClient, PaymentTransactionRepository repository) {
        this.paystackWebClient = paystackWebClient;
        this.repository = repository;
    }

    @SuppressWarnings("unchecked")
    public InitiatePaymentResponse initiate(InitiatePaymentRequest request) {
        String reference = "PS-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> body = Map.of(
                "email", request.getEmail(),
                "amount", request.getAmountKobo(),
                "reference", reference
        );

        Map<String, Object> response = paystackWebClient.post()
                .uri("/transaction/initialize")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        Map<String, Object> data = (Map<String, Object>) response.get("data");

        PaymentTransaction tx = new PaymentTransaction(
                reference, request.getUserId(), request.getAmountKobo(), "GHS", request.getPurpose());
        repository.save(tx);

        return new InitiatePaymentResponse(
                (String) data.get("authorization_url"),
                (String) data.get("access_code"),
                reference);
    }

    @SuppressWarnings("unchecked")
    public VerifyPaymentResponse verify(String reference) {
        PaymentTransaction tx = repository.findByReference(reference)
                .orElseThrow(() -> new NotFoundException("No transaction found for reference " + reference));

        Map<String, Object> response = paystackWebClient.get()
                .uri("/transaction/verify/{reference}", reference)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        Map<String, Object> data = (Map<String, Object>) response.get("data");
        String status = (String) data.get("status");

        if ("success".equals(status)) {
            tx.markSuccess();
        } else {
            tx.markFailed();
        }
        repository.save(tx);

        return new VerifyPaymentResponse(tx.getReference(), tx.getStatus().name(), tx.getAmountKobo(), tx.getPurpose());
    }
}
