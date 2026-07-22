package com.studysync.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class InitiatePaymentRequest {

    @NotNull
    private String userId;

    @NotBlank
    private String email;

    @NotNull
    @Positive
    private Long amountKobo;

    @NotBlank
    private String purpose;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Long getAmountKobo() { return amountKobo; }
    public void setAmountKobo(Long amountKobo) { this.amountKobo = amountKobo; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
}
