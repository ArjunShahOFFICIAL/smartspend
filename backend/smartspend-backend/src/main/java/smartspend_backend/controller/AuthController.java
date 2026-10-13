package smartspend_backend.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import smartspend_backend.dto.LoginRequest;
import smartspend_backend.model.UserAccount;
import smartspend_backend.repository.UserAccountRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.cors.allowed-origin:http://localhost:5173}")
public class AuthController {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> register(@Valid @RequestBody UserAccount user) {
        String email = user.getEmail().trim().toLowerCase();

        if (userAccountRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "An account already exists with this email");
        }

        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userAccountRepository.save(user);

        return Map.of("message", "Registration successful");
    }

    @PostMapping("/login")
    public Map<String, String> login(@Valid @RequestBody LoginRequest loginRequest) {
        String email = loginRequest.getEmail().trim().toLowerCase();

        UserAccount user = userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Incorrect email or password"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }

        return Map.of(
                "id", user.getId().toString(),
                "name", user.getName(),
                "message", "Login successful"
        );
    }
}