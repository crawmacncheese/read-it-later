package com.crawmacncheese.spring_boot.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        /**
         * HS256 signing secret — must be at least 256 bits (32 UTF-8 bytes).
         * Override via environment in production.
         */
        String secret,
        /**
         * Token lifetime in milliseconds.
         */
        long expirationMs
) {
}
