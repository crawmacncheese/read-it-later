package com.crawmacncheese.spring_boot.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.crawmacncheese.spring_boot.model.Bookmark;

public interface BookmarkRepository extends JpaRepository<Bookmark, Integer> {
    Optional<Bookmark> findByUserIdAndCanonicalUrl(Integer userId, String canonicalUrl);
    Optional<Bookmark> findByIdAndUserId(Integer id, Integer userId);
    List<Bookmark> findAllByUserIdOrderByCreatedAtDesc(Integer userId);
}

