package com.crawmacncheese.spring_boot.controllers;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.crawmacncheese.spring_boot.dto.CreateBookmarkRequest;
import com.crawmacncheese.spring_boot.dto.UpdateBookmarkRequest;
import com.crawmacncheese.spring_boot.repository.AppUserRepository;
import com.crawmacncheese.spring_boot.service.BookmarkService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/bookmarks")
public class BookmarkController {

    private static final int MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;

    private final BookmarkService bookmarkService;
    private final AppUserRepository appUserRepository;

    public BookmarkController(BookmarkService bookmarkService, AppUserRepository appUserRepository) {
        this.bookmarkService = bookmarkService;
        this.appUserRepository = appUserRepository;
    }

    private Integer requireUserId(UserDetails userDetails) {
        if (userDetails == null) throw new IllegalStateException("unauthorized");
        String email = userDetails.getUsername();
        return appUserRepository.findByEmail(email)
                .map(u -> u.getId())
                .orElseThrow(() -> new IllegalStateException("user_not_found"));
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody CreateBookmarkRequest body) {
        try {
            Integer userId = requireUserId(userDetails);
            var result = bookmarkService.createOrGet(userId, body);
            return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.bookmark());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails userDetails) {
        Integer userId = requireUserId(userDetails);
        return ResponseEntity.ok(bookmarkService.list(userId));
    }

    @GetMapping("{id}")
    public ResponseEntity<?> get(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Integer id) {
        Integer userId = requireUserId(userDetails);
        return bookmarkService.get(userId, id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found")));
    }

    @PutMapping("{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Integer id, @Valid @RequestBody UpdateBookmarkRequest body) {
        Integer userId = requireUserId(userDetails);
        return bookmarkService.update(userId, id, body)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found")));
    }

    @DeleteMapping("{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Integer id) {
        Integer userId = requireUserId(userDetails);
        boolean deleted = bookmarkService.delete(userId, id);
        if (!deleted) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found"));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("{id}/snapshot")
    public ResponseEntity<?> requestSnapshot(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        Integer userId = requireUserId(userDetails);
        String apiBaseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        String token = authorizationHeader == null ? null : authorizationHeader.replaceFirst("(?i)^Bearer\\s+", "").trim();
        return bookmarkService.requestSnapshotAndLaunch(userId, id, apiBaseUrl, token)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found")));
    }

    @GetMapping("{id}/snapshot")
    public ResponseEntity<?> getSnapshot(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Integer id) {
        Integer userId = requireUserId(userDetails);
        var dtoOpt = bookmarkService.get(userId, id);
        if (dtoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found"));
        }
        var dto = dtoOpt.get();
        if (!"READY".equals(dto.snapshotStatus())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "snapshot_not_ready"));
        }

        var resourceOpt = bookmarkService.getSnapshotResource(userId, id);
        if (resourceOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "snapshot_missing"));
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_HTML_VALUE)
                .body(resourceOpt.get());
    }

    /**
     * Phase 2: register a snapshot HTML file for a bookmark (used by tests and temporary worker integration).
     * In Phase 3, the worker will call this (or write directly + update DB) instead of manual uploads.
     */
    @PutMapping(value = "{id}/snapshot", consumes = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<?> putSnapshotHtml(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer id,
            @RequestBody byte[] body
    ) {
        Integer userId = requireUserId(userDetails);
        if (body == null || body.length == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "empty_body"));
        }
        if (body.length > MAX_SNAPSHOT_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of("error", "snapshot_too_large"));
        }

        return bookmarkService.uploadSnapshotHtml(userId, id, body)
                .<ResponseEntity<?>>map(dto -> {
                    if ("FAILED".equals(dto.snapshotStatus())) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "snapshot_write_failed", "message", dto.snapshotError()));
                    }
                    return ResponseEntity.ok(dto);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found")));
    }
}

