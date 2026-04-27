package com.crawmacncheese.spring_boot.dto;

import java.time.LocalDateTime;
import java.util.List;

public record BookmarkListItemDTO(
        Integer id,
        String url,
        String title,
        List<String> tags,
        Integer priority,
        LocalDateTime createdAt
) {}

