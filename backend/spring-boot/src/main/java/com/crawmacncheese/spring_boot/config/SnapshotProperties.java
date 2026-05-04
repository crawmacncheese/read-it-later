package com.crawmacncheese.spring_boot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.snapshot")
public record SnapshotProperties(
        /**
         * Absolute or relative filesystem directory where snapshot HTML files are stored.
         */
        String storageRoot
) {}
