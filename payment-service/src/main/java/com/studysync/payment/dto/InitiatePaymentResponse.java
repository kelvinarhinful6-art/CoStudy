package com.studysync.payment.dto;

public class InitiatePaymentResponse {
    private String authorizationUrl;
    private String accessCode;
    private String reference;

    public InitiatePaymentResponse(String authorizationUrl, String accessCode, String reference) {
        this.authorizationUrl = authorizationUrl;
        this.accessCode = accessCode;
        this.reference = reference;
    }

    public String getAuthorizationUrl() { return authorizationUrl; }
    public String getAccessCode() { return accessCode; }
    public String getReference() { return reference; }
}
