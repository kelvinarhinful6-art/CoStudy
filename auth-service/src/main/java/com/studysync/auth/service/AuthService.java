package com.studysync.auth.service;

import com.studysync.auth.dto.AuthResponse;
import com.studysync.auth.dto.LoginRequest;
import com.studysync.auth.dto.ProfileUpdateRequest;
import com.studysync.auth.dto.RegisterRequest;
import com.studysync.auth.dto.UserSummary;
import com.studysync.auth.exception.BadRequestException;
import com.studysync.auth.exception.ConflictException;
import com.studysync.auth.exception.UnauthorizedException;
import com.studysync.auth.security.JwtService;
import com.studysync.auth.user.AppUser;
import com.studysync.auth.user.AppUserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {
    private final AppUserRepository repo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmailOtpService otpService;
    private final long expMinutes = 1440; // 24 hours

    public AuthService(AppUserRepository repo, PasswordEncoder encoder, JwtService jwt, EmailOtpService otpService) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwt = jwt;
        this.otpService = otpService;
    }

    public void requestOtp(String email, String username) {
        if (repo.existsByUsername(username)) throw new ConflictException("username already taken");
        if (repo.existsByEmail(email)) throw new ConflictException("email already registered");
        otpService.generateAndSendOtp(email, username);
    }

    @Transactional
    public java.util.List<UserSummary> listStudents() {
        return repo.findAll().stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<UserSummary> listSupportAccounts() {
        return repo.findAll().stream()
                .filter(u -> u.getUserType() == com.studysync.auth.user.UserType.ADMIN)
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (repo.existsByUsername(req.username())) throw new ConflictException("username already taken");
        if (repo.existsByEmail(req.email())) throw new ConflictException("email already registered");

        // Verify 4-digit OTP code if provided
        if (req.otpCode() != null && !req.otpCode().isBlank()) {
            boolean valid = otpService.verifyOtp(req.email(), req.otpCode());
            if (!valid) {
                throw new BadRequestException("Invalid or expired 4-digit verification code. Please check your email or click resend.");
            }
        }

        AppUser user = new AppUser();
        user.setUsername(req.username());
        user.setEmail(req.email());
        user.setPasswordHash(encoder.encode(req.password()));
        user.setUserType(req.userType());
        user.setVerified(true);
        repo.save(user);
        return buildResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        AppUser user = repo.findByUsername(req.usernameOrEmail())
                .or(() -> repo.findByEmail(req.usernameOrEmail()))
                .orElseThrow(() -> new UnauthorizedException("invalid credentials"));
        if (!encoder.matches(req.password(), user.getPasswordHash())) throw new UnauthorizedException("invalid credentials");
        return buildResponse(user);
    }

    @Transactional
    public UserSummary updateProfile(UUID userId, ProfileUpdateRequest req) {
        AppUser user = repo.findById(userId).orElseThrow(() -> new UnauthorizedException("user not found"));
        user.setFullName(req.fullName()); user.setProgram(req.program()); user.setAge(req.age()); user.setYearOfStudy(req.yearOfStudy());
        if (req.tutorDisplayName() != null) user.setTutorDisplayName(req.tutorDisplayName());
        repo.save(user);
        return toSummary(user);
    }

    private UserSummary toSummary(AppUser u) {
        return new UserSummary(String.valueOf(u.getUserId()), u.getUsername(), u.getEmail(), u.getUserType(), u.isVerified(), u.getFullName(), u.getProgram(), u.getAge(), u.getYearOfStudy(), u.getTutorDisplayName());
    }

    private AuthResponse buildResponse(AppUser user) {
        String token = jwt.generateToken(user.getUserId().toString(), user.getUsername(), user.getUserType().name());
        return new AuthResponse(token, expMinutes * 60, toSummary(user));
    }
}