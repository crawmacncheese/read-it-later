package com.crawmacncheese.spring_boot.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.repository.AppUserRepository;

@Service
public class AppUserService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AppUser registerUser(String username, String email, String password) throws Exception {
        if (appUserRepository.findByUsername(username).isPresent()) {
            throw new Exception("Username already exists");
        }
        if (appUserRepository.findByEmail(email).isPresent()) {
            throw new Exception("Email already exists");
        }
        String hashedPassword = passwordEncoder.encode(password);
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(hashedPassword);
        return appUserRepository.save(user);
    }

    public Optional<AppUser> authenticateByEmail(String email, String password) {
        return appUserRepository.findByEmail(email)
                .filter(user -> passwordEncoder.matches(password, user.getPassword()));
    }

    public List<AppUser> getAllAppUsers() {
        return appUserRepository.findAll();
    }

    public void insertAppUser(AppUser appUser) {
        appUserRepository.save(appUser);
    }

    public AppUser getAppUserById(Integer id) {
        return appUserRepository.findById(id)
            .orElseThrow(() -> new IllegalStateException(id + " not found"));
    }

    public Optional<AppUser> getAppUserByUsername(String username) {
        return appUserRepository.findByUsername(username);
    }

    public Optional<AppUser> getAppUserByEmail(String email) {
        return appUserRepository.findByEmail(email);
    }
}
