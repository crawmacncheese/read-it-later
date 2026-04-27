package com.crawmacncheese.spring_boot.controllers;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.crawmacncheese.spring_boot.dto.CreateBookmarkRequest;
import com.crawmacncheese.spring_boot.dto.UpdateBookmarkRequest;
import com.crawmacncheese.spring_boot.repository.AppUserRepository;
import com.crawmacncheese.spring_boot.service.BookmarkService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/bookmarks")
public class BookmarkController {

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
}

