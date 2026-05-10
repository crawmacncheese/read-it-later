package com.crawmacncheese.spring_boot.service;

import java.util.concurrent.CompletableFuture;

public interface SnapshotWorkerLauncher {
    record LaunchResult(int exitCode, String stdout, String stderr) {
        public boolean ok() { return exitCode == 0; }
    }

    CompletableFuture<LaunchResult> launchSnapshot(String apiBaseUrl, String jwtToken, Integer bookmarkId, String url);
}

