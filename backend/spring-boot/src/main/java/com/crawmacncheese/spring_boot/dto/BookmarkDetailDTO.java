package com.crawmacncheese.spring_boot.dto;

import java.time.LocalDateTime;
import java.util.List;

public record BookmarkDetailDTO(
        Integer id,
        String url,
        String title,
        String content,
        String summary,
        List<String> tags,
        Integer priority,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}

