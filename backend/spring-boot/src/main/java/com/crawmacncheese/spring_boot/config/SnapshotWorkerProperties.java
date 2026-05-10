package com.crawmacncheese.spring_boot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.snapshot.worker")
public record SnapshotWorkerProperties(
        boolean enabled,
        String nodeCommand,
        String workingDir,
        String scriptPath
) {
    public SnapshotWorkerProperties {
        if (nodeCommand == null || nodeCommand.isBlank()) nodeCommand = "node";
        if (workingDir == null || workingDir.isBlank()) workingDir = "snapshot-worker";
        if (scriptPath == null || scriptPath.isBlank()) scriptPath = "src/snapshot.js";
    }
}

