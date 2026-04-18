package com.crawmacncheese.spring_boot.controllers;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.crawmacncheese.spring_boot.AllArgsConstructor;
import com.crawmacncheese.spring_boot.dto.AppUserDTO;
import com.crawmacncheese.spring_boot.mappers.AppUserMapper;
import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.security.AppUserDetails;
import com.crawmacncheese.spring_boot.security.JwtUtil;
import com.crawmacncheese.spring_boot.service.AppUserService;

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
    public ResponseEntity<AppUserDTO> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        String password = body.get("password");
        try {
            AppUser user = appUserService.registerUser(username, email, password);
            AppUserDTO userDTO = appUserMapper.toDto(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(userDTO);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing username or password"));
        }
        var userOpt = appUserService.authenticate(username, password);
        if (userOpt.isPresent()) {
            AppUser user = userOpt.get();
            AppUserDTO userDTO = appUserMapper.toDto(user);
            AppUserDetails userDetails = new AppUserDetails(userDTO);
            String token = jwtUtil.generateToken(userDetails);
            Map<String, Object> response = Map.of(
                "token", token,
                "user", userDTO
            );
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }
    

}
