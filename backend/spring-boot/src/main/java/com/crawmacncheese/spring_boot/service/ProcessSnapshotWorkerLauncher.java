package com.crawmacncheese.spring_boot.service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;

import com.crawmacncheese.spring_boot.config.SnapshotWorkerProperties;

@Component
public class ProcessSnapshotWorkerLauncher implements SnapshotWorkerLauncher {

    private static final Duration DEFAULT_TIMEOUT = Duration.ofMinutes(5);

    private final SnapshotWorkerProperties props;
    private final Executor executor;

    public ProcessSnapshotWorkerLauncher(SnapshotWorkerProperties props, TaskExecutor taskExecutor) {
        this.props = props;
        this.executor = taskExecutor::execute;
    }

    @Override
    public CompletableFuture<LaunchResult> launchSnapshot(String apiBaseUrl, String jwtToken, Integer bookmarkId, String url) {
        if (!props.enabled()) {
            return CompletableFuture.completedFuture(new LaunchResult(0, "", ""));
        }
        return CompletableFuture.supplyAsync(() -> runProcess(apiBaseUrl, jwtToken, bookmarkId, url), executor);
    }

    private LaunchResult runProcess(String apiBaseUrl, String jwtToken, Integer bookmarkId, String url) {
        try {
            var pb = new ProcessBuilder(props.nodeCommand(), props.scriptPath());
            pb.directory(new File(props.workingDir()));
            Map<String, String> env = pb.environment();
            env.put("API_BASE_URL", apiBaseUrl);
            env.put("AUTH_TOKEN", jwtToken);
            env.put("BOOKMARK_ID", String.valueOf(bookmarkId));
            env.put("SNAPSHOT_URL", url);

            Process p = pb.start();
            ByteArrayOutputStream stdout = new ByteArrayOutputStream();
            ByteArrayOutputStream stderr = new ByteArrayOutputStream();
            Thread t1 = new Thread(() -> copy(p.getInputStream(), stdout), "snapshot-worker-stdout");
            Thread t2 = new Thread(() -> copy(p.getErrorStream(), stderr), "snapshot-worker-stderr");
            t1.start();
            t2.start();

            boolean finished = p.waitFor(DEFAULT_TIMEOUT.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
            if (!finished) {
                p.destroyForcibly();
                return new LaunchResult(124, "", "snapshot_worker_timeout");
            }
            t1.join(1_000);
            t2.join(1_000);

            int exit = p.exitValue();
            return new LaunchResult(
                    exit,
                    stdout.toString(StandardCharsets.UTF_8),
                    stderr.toString(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            return new LaunchResult(1, "", e.getMessage() == null ? e.toString() : e.getMessage());
        }
    }

    private static void copy(InputStream in, ByteArrayOutputStream out) {
        try (in; out) {
            in.transferTo(out);
        } catch (Exception ignored) {
        }
    }
}

