package com.studysync.payment.dto;

public class VerifyPaymentResponse {
    private String reference;
    private String status;
    private Long amountKobo;
    private String purpose;

    public VerifyPaymentResponse(String reference, String status, Long amountKobo, String purpose) {
        this.reference = reference;
        this.status = status;
        this.amountKobo = amountKobo;
        this.purpose = purpose;
    }

    public String getReference() { return reference; }
    public String getStatus() { return status; }
    public Long getAmountKobo() { return amountKobo; }
    public String getPurpose() { return purpose; }
}
