package com.crawmacncheese.spring_boot.service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crawmacncheese.spring_boot.dto.BookmarkDetailDTO;
import com.crawmacncheese.spring_boot.dto.BookmarkListItemDTO;
import com.crawmacncheese.spring_boot.dto.CreateBookmarkRequest;
import com.crawmacncheese.spring_boot.dto.UpdateBookmarkRequest;
import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.model.Bookmark;
import com.crawmacncheese.spring_boot.model.SnapshotStatus;
import com.crawmacncheese.spring_boot.repository.AppUserRepository;
import com.crawmacncheese.spring_boot.repository.BookmarkRepository;

@Service
public class BookmarkService {

    public record CreateOrGetResult(boolean created, BookmarkDetailDTO bookmark) {}

    private final BookmarkRepository bookmarkRepository;
    private final AppUserRepository appUserRepository;
    private final UrlNormalizer urlNormalizer;
    private final SnapshotStorageService snapshotStorageService;
    private final SnapshotWorkerLauncher snapshotWorkerLauncher;

    public BookmarkService(
            BookmarkRepository bookmarkRepository,
            AppUserRepository appUserRepository,
            UrlNormalizer urlNormalizer,
            SnapshotStorageService snapshotStorageService,
            SnapshotWorkerLauncher snapshotWorkerLauncher
    ) {
        this.bookmarkRepository = bookmarkRepository;
        this.appUserRepository = appUserRepository;
        this.urlNormalizer = urlNormalizer;
        this.snapshotStorageService = snapshotStorageService;
        this.snapshotWorkerLauncher = snapshotWorkerLauncher;
    }

    @Transactional
    public CreateOrGetResult createOrGet(Integer userId, CreateBookmarkRequest req) {
        String canonicalUrl = urlNormalizer.canonicalize(req.url());

        Optional<Bookmark> existing = bookmarkRepository.findByUserIdAndCanonicalUrl(userId, canonicalUrl);
        if (existing.isPresent()) {
            return new CreateOrGetResult(false, toDetailDto(existing.get()));
        }

        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("user_not_found"));

        Bookmark b = new Bookmark();
        b.setUser(user);
        b.setOriginalUrl(req.url().trim());
        b.setCanonicalUrl(canonicalUrl);
        b.setTags(req.tags() == null ? null : req.tags().toArray(String[]::new));
        b.setPriority(req.priority());

        Bookmark saved = bookmarkRepository.save(b);
        return new CreateOrGetResult(true, toDetailDto(saved));
    }

    @Transactional(readOnly = true)
    public List<BookmarkListItemDTO> list(Integer userId) {
        return bookmarkRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toListDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<BookmarkDetailDTO> get(Integer userId, Integer bookmarkId) {
        return bookmarkRepository.findByIdAndUserId(bookmarkId, userId).map(this::toDetailDto);
    }

    @Transactional
    public Optional<BookmarkDetailDTO> update(Integer userId, Integer bookmarkId, UpdateBookmarkRequest req) {
        Optional<Bookmark> opt = bookmarkRepository.findByIdAndUserId(bookmarkId, userId);
        if (opt.isEmpty()) return Optional.empty();

        Bookmark b = opt.get();
        if (req.title() != null) b.setTitle(req.title());
        if (req.tags() != null) b.setTags(req.tags().toArray(String[]::new));
        if (req.priority() != null) b.setPriority(req.priority());

        return Optional.of(toDetailDto(bookmarkRepository.save(b)));
    }

    @Transactional
    public boolean delete(Integer userId, Integer bookmarkId) {
        Optional<Bookmark> opt = bookmarkRepository.findByIdAndUserId(bookmarkId, userId);
        if (opt.isEmpty()) return false;
        Bookmark b = opt.get();
        snapshotStorageService.deleteIfExists(userId, bookmarkId);
        bookmarkRepository.delete(b);
        return true;
    }

    @Transactional
    public Optional<BookmarkDetailDTO> requestSnapshot(Integer userId, Integer bookmarkId) {
        Optional<Bookmark> opt = bookmarkRepository.findByIdAndUserId(bookmarkId, userId);
        if (opt.isEmpty()) return Optional.empty();

        Bookmark b = opt.get();
        // Best-effort cleanup of any prior snapshot file for this bookmark
        snapshotStorageService.deleteIfExists(userId, bookmarkId);
        b.setSnapshotStatus(SnapshotStatus.PENDING);
        b.setSnapshotError(null);
        b.setSnapshotObjectKey(null);
        b.setSnapshotCreatedAt(null);
        
        return Optional.of(toDetailDto(bookmarkRepository.save(b)));
    }

    /**
     * Phase 3 Part 2: request snapshot (PENDING) and asynchronously launch the Node worker.
     * The worker will call PUT /api/v1/bookmarks/{id}/snapshot when it succeeds.
     */
    @Transactional
    public Optional<BookmarkDetailDTO> requestSnapshotAndLaunch(Integer userId, Integer bookmarkId, String apiBaseUrl, String jwtToken) {
        Optional<Bookmark> opt = bookmarkRepository.findByIdAndUserId(bookmarkId, userId);
        if (opt.isEmpty()) return Optional.empty();

        Bookmark b = opt.get();
        snapshotStorageService.deleteIfExists(userId, bookmarkId);
        b.setSnapshotStatus(SnapshotStatus.PENDING);
        b.setSnapshotError(null);
        b.setSnapshotObjectKey(null);
        b.setSnapshotCreatedAt(null);
        bookmarkRepository.save(b);

        // Launch in background; return immediately with PENDING.
        if (jwtToken != null && !jwtToken.isBlank()) {
            String targetUrl = b.getOriginalUrl();
            snapshotWorkerLauncher.launchSnapshot(apiBaseUrl, jwtToken, bookmarkId, targetUrl)
                    .whenComplete((result, error) -> {
                        if (error != null) {
                            markSnapshotFailed(userId, bookmarkId, "snapshot_worker_exception: " + error.getMessage());
                            return;
                        }
                        if (result != null && !result.ok()) {
                            String msg = result.stderr() == null || result.stderr().isBlank()
                                    ? "snapshot_worker_exit_" + result.exitCode()
                                    : result.stderr();
                            markSnapshotFailed(userId, bookmarkId, msg);
                        }
                    });
        } else {
            // If no token is available, fail fast so the UI gets a clear error.
            markSnapshotFailed(userId, bookmarkId, "missing_auth_token_for_worker");
        }

        return Optional.of(toDetailDto(b));
    }

    @Transactional
    protected void markSnapshotFailed(Integer userId, Integer bookmarkId, String message) {
        Optional<Bookmark> opt = bookmarkRepository.findByIdAndUserId(bookmarkId, userId);
        if (opt.isEmpty()) return;
        Bookmark b = opt.get();
        if (b.getSnapshotStatus() == SnapshotStatus.READY) return;
        b.setSnapshotStatus(SnapshotStatus.FAILED);
        b.setSnapshotError(message);
        bookmarkRepository.save(b);
    }

    @Transactional
    public Optional<BookmarkDetailDTO> uploadSnapshotHtml(Integer userId, Integer bookmarkId, byte[] htmlBytes) {
        Optional<Bookmark> opt = bookmarkRepository.findByIdAndUserId(bookmarkId, userId);
        if (opt.isEmpty()) return Optional.empty();

        Bookmark b = opt.get();
        try {
            snapshotStorageService.writeHtml(userId, bookmarkId, htmlBytes);
            String key = snapshotStorageService.objectKeyFor(userId, bookmarkId);
            b.setSnapshotObjectKey(key);
            b.setSnapshotStatus(SnapshotStatus.READY);
            b.setSnapshotError(null);
            b.setSnapshotCreatedAt(java.time.LocalDateTime.now());
            return Optional.of(toDetailDto(bookmarkRepository.save(b)));
        } catch (Exception e) {
            b.setSnapshotStatus(SnapshotStatus.FAILED);
            b.setSnapshotError(e.getMessage());
            return Optional.of(toDetailDto(bookmarkRepository.save(b)));
        }
    }

    @Transactional(readOnly = true)
    public Optional<Resource> getSnapshotResource(Integer userId, Integer bookmarkId) {
        Optional<Bookmark> opt = bookmarkRepository.findByIdAndUserId(bookmarkId, userId);
        if (opt.isEmpty()) return Optional.empty();
        Bookmark b = opt.get();
        if (b.getSnapshotStatus() != SnapshotStatus.READY) return Optional.empty();
        try {
            return Optional.of(snapshotStorageService.readHtml(userId, bookmarkId));
        } catch (Exception e) {
            return Optional.empty();
        }
    }


    private BookmarkListItemDTO toListDto(Bookmark b) {
        return new BookmarkListItemDTO(
                b.getId(),
                b.getOriginalUrl(),
                b.getTitle(),
                b.getTags() == null ? List.of() : Arrays.asList(b.getTags()),
                b.getPriority(),
                b.getCreatedAt(),
                b.getSnapshotStatus() == null ? "NONE" : b.getSnapshotStatus().name()
        );
    }

    private BookmarkDetailDTO toDetailDto(Bookmark b) {
        return new BookmarkDetailDTO(
                b.getId(),
                b.getOriginalUrl(),
                b.getTitle(),
                b.getContent(),
                b.getSummary(),
                b.getTags() == null ? List.of() : Arrays.asList(b.getTags()),
                b.getPriority(),
                b.getCreatedAt(),
                b.getUpdatedAt(),
                b.getSnapshotStatus() == null ? "NONE" : b.getSnapshotStatus().name(),
                b.getSnapshotObjectKey(),
                b.getSnapshotError(),
                b.getSnapshotCreatedAt()
        );
    }
}

