package com.crawmacncheese.spring_boot.controllers;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.crawmacncheese.spring_boot.AllArgsConstructor;
import com.crawmacncheese.spring_boot.dto.AuthResponse;
import com.crawmacncheese.spring_boot.dto.AppUserDTO;
import com.crawmacncheese.spring_boot.dto.LoginRequest;
import com.crawmacncheese.spring_boot.dto.RegisterRequest;
import com.crawmacncheese.spring_boot.mappers.AppUserMapper;
import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.security.AppUserDetails;
import com.crawmacncheese.spring_boot.security.JwtUtil;
import com.crawmacncheese.spring_boot.service.AppUserService;

import jakarta.validation.Valid;

@AllArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserService appUserService;
    private final AppUserMapper appUserMapper;
    private final JwtUtil jwtUtil;

    public AuthController(AppUserService appUserService, AppUserMapper appUserMapper, JwtUtil jwtUtil) {
        this.appUserService = appUserService;
        this.appUserMapper = appUserMapper;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest body) {
        try {
            AppUser user = appUserService.registerUser(body.username(), body.email(), body.password());
            AppUserDTO userDTO = appUserMapper.toDto(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(userDTO);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body) {
        var userOpt = appUserService.authenticateByEmail(body.email(), body.password());
        if (userOpt.isPresent()) {
            AppUser user = userOpt.get();
            AppUserDTO userDTO = appUserMapper.toDto(user);
            AppUserDetails userDetails = new AppUserDetails(userDTO);
            String token = jwtUtil.generateToken(userDetails);
            return ResponseEntity.ok(new AuthResponse(token, userDTO));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "invalid_credentials"));
    }

}
