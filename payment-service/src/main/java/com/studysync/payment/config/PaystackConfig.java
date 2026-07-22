package com.studysync.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PaystackConfig {

    @Value("${paystack.base-url}")
    private String baseUrl;

    @Value("${paystack.secret-key}")
    private String secretKey;

    @Bean
    public WebClient paystackWebClient() {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + secretKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
