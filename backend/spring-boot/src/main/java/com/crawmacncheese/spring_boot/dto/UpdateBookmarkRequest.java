package com.crawmacncheese.spring_boot.dto;

import java.util.List;

import jakarta.validation.constraints.Size;

public record UpdateBookmarkRequest(
        @Size(max = 512) String title,
        List<@Size(min = 1, max = 64) String> tags,
        Integer priority
) {}

