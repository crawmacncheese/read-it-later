package com.crawmacncheese.spring_boot.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.crawmacncheese.spring_boot.model.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, Integer> {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByEmail(String email);

}
