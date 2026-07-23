package com.studysync.auth.web;
import com.studysync.auth.dto.*;
import com.studysync.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) { this.service = service; }

    @GetMapping("/users")
    public java.util.List<UserSummary> listUsers() { return service.listStudents(); }

    @GetMapping("/support-accounts")
    public java.util.List<UserSummary> supportAccounts() { return service.listSupportAccounts(); }

    public record OtpRequest(String email, String username) {}

    @PostMapping("/request-otp")
    public java.util.Map<String, Object> requestOtp(@RequestBody OtpRequest request) {
        service.requestOtp(request.email(), request.username());
        return java.util.Map.of("success", true, "message", "OTP verification code sent to " + request.email());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) { return service.register(request); }


    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) { return service.login(request); }

    @PutMapping("/profile/{userId}")
    public UserSummary updateProfile(@PathVariable UUID userId, @RequestBody ProfileUpdateRequest request) { return service.updateProfile(userId, request); }
}