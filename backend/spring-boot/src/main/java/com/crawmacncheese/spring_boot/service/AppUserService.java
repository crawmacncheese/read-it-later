package com.crawmacncheese.spring_boot.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.repository.AppUserRepository;

@Service
public class AppUserService {

    private final AppUserRepository appUserRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AppUserService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
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

    public Optional<AppUser> authenticate(String username, String password) {
        Optional<AppUser> userOpt = appUserRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            AppUser user = userOpt.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                return Optional.of(user);
            }
        }
        return Optional.empty();
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
