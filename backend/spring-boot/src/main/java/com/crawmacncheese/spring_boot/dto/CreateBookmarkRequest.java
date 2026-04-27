package com.crawmacncheese.spring_boot.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBookmarkRequest(
        @NotBlank @Size(max = 2048) String url,
        List<@Size(min = 1, max = 64) String> tags,
        Integer priority
) {}

