package com.studysync.auth.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmailOtpService {

    private final JavaMailSender mailSender;
    private final ConcurrentHashMap<String, OtpRecord> otpStore = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public EmailOtpService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public record OtpRecord(String code, long expiresAtMillis) {}

    public String generateAndSendOtp(String email, String username) {
        String cleanEmail = email.trim().toLowerCase();
        // Generate a 4-digit code (e.g. 1000 - 9999)
        int num = 1000 + random.nextInt(9000);
        String code = String.valueOf(num);
        long expiresAt = System.currentTimeMillis() + (10 * 60 * 1000); // 10 minutes

        otpStore.put(cleanEmail, new OtpRecord(code, expiresAt));

        // Attempt sending email via Gmail SMTP
        if (mailSender != null && fromEmail != null && !fromEmail.isBlank()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(cleanEmail);
                message.setSubject("Your StudySync Verification Code: " + code);
                message.setText("Hello " + (username != null ? username : "Student") + ",\n\n"
                        + "Welcome to StudySync! Your 4-digit email verification code is:\n\n"
                        + "   " + code + "   \n\n"
                        + "Please enter this 4-digit code in the app to complete your account registration.\n"
                        + "This code will expire in 10 minutes.\n\n"
                        + "Best regards,\n"
                        + "StudySync Team");
                mailSender.send(message);
                System.out.println("[EmailOtpService] Successfully sent OTP code " + code + " to " + cleanEmail);
            } catch (Exception e) {
                System.err.println("[EmailOtpService] Mail dispatch failed: " + e.getMessage() + ". OTP code is: " + code);
            }
        } else {
            System.out.println("[EmailOtpService] MailSender not configured. OTP code for " + cleanEmail + " is: " + code);
        }

        return code;
    }

    public boolean verifyOtp(String email, String inputCode) {
        if (email == null || inputCode == null) return false;
        String cleanEmail = email.trim().toLowerCase();
        OtpRecord record = otpStore.get(cleanEmail);
        if (record == null) return false;

        if (System.currentTimeMillis() > record.expiresAtMillis()) {
            otpStore.remove(cleanEmail);
            return false;
        }

        boolean valid = record.code().equalsIgnoreCase(inputCode.trim());
        if (valid) {
            otpStore.remove(cleanEmail);
        }
        return valid;
    }
}
