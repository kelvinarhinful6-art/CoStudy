package com.studysync.auth.web;

import com.studysync.auth.dto.AuthResponse;
import com.studysync.auth.dto.LoginRequest;
import com.studysync.auth.dto.ProfileUpdateRequest;
import com.studysync.auth.dto.RegisterRequest;
import com.studysync.auth.dto.UserSummary;
import com.studysync.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * The public auth endpoints.
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/users
 * PUT  /api/auth/profile/{userId}
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @GetMapping("/users")
    public java.util.List<UserSummary> listUsers() {
        return service.listStudents();
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return service.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    @PutMapping("/profile/{userId}")
    public UserSummary updateProfile(@PathVariable UUID userId, @RequestBody ProfileUpdateRequest request) {
        return service.updateProfile(userId, request);
    }
}