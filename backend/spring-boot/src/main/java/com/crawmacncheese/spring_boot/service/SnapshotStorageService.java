package com.crawmacncheese.spring_boot.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import com.crawmacncheese.spring_boot.config.SnapshotProperties;

@Service
public class SnapshotStorageService {

    private final Path root;

    public SnapshotStorageService(SnapshotProperties props) {
        if (props.storageRoot() == null || props.storageRoot().isBlank()) {
            throw new IllegalStateException("app.snapshot.storage-root must be set");
        }
        this.root = Path.of(props.storageRoot()).toAbsolutePath().normalize();
    }

    public String objectKeyFor(Integer userId, Integer bookmarkId) {
        return "snapshots/" + userId + "/" + bookmarkId + ".html";
    }

    public void writeHtml(Integer userId, Integer bookmarkId, byte[] htmlBytes) throws IOException {
        Path file = resolveFile(userId, bookmarkId);
        Files.createDirectories(file.getParent());
        Files.write(file, htmlBytes);
    }

    public Resource readHtml(Integer userId, Integer bookmarkId) throws IOException {
        Path file = resolveFile(userId, bookmarkId);
        if (!Files.exists(file)) {
            throw new IOException("snapshot_missing_on_disk");
        }
        InputStream in = Files.newInputStream(file);
        return new InputStreamResource(in);
    }

    public void deleteIfExists(Integer userId, Integer bookmarkId) {
        try {
            Path file = resolveFile(userId, bookmarkId);
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    private Path resolveFile(Integer userId, Integer bookmarkId) {
        if (userId == null || bookmarkId == null) {
            throw new IllegalArgumentException("userId and bookmarkId are required");
        }
        // Keep paths strictly under root/<userId>/<bookmarkId>.html
        Path userDir = root.resolve(String.valueOf(userId)).normalize();
        if (!userDir.startsWith(root)) {
            throw new IllegalArgumentException("invalid snapshot path");
        }
        Path file = userDir.resolve(bookmarkId + ".html").normalize();
        if (!file.startsWith(userDir)) {
            throw new IllegalArgumentException("invalid snapshot path");
        }
        return file;
    }

    public static byte[] utf8Bytes(String html) {
        return html.getBytes(StandardCharsets.UTF_8);
    }
}
