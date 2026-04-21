package com.crawmacncheese.spring_boot.dto;

public record AuthResponse(
        String token,
        AppUserDTO user
) {
}

