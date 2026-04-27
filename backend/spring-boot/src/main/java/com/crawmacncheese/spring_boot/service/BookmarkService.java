package com.crawmacncheese.spring_boot.service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crawmacncheese.spring_boot.dto.BookmarkDetailDTO;
import com.crawmacncheese.spring_boot.dto.BookmarkListItemDTO;
import com.crawmacncheese.spring_boot.dto.CreateBookmarkRequest;
import com.crawmacncheese.spring_boot.dto.UpdateBookmarkRequest;
import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.model.Bookmark;
import com.crawmacncheese.spring_boot.repository.AppUserRepository;
import com.crawmacncheese.spring_boot.repository.BookmarkRepository;

@Service
public class BookmarkService {

    public record CreateOrGetResult(boolean created, BookmarkDetailDTO bookmark) {}

    private final BookmarkRepository bookmarkRepository;
    private final AppUserRepository appUserRepository;
    private final UrlNormalizer urlNormalizer;

    public BookmarkService(
            BookmarkRepository bookmarkRepository,
            AppUserRepository appUserRepository,
            UrlNormalizer urlNormalizer
    ) {
        this.bookmarkRepository = bookmarkRepository;
        this.appUserRepository = appUserRepository;
        this.urlNormalizer = urlNormalizer;
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
        bookmarkRepository.delete(opt.get());
        return true;
    }

    private BookmarkListItemDTO toListDto(Bookmark b) {
        return new BookmarkListItemDTO(
                b.getId(),
                b.getOriginalUrl(),
                b.getTitle(),
                b.getTags() == null ? List.of() : Arrays.asList(b.getTags()),
                b.getPriority(),
                b.getCreatedAt()
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
                b.getUpdatedAt()
        );
    }
}

