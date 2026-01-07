package com.crawmacncheese.spring_boot;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppUserService {

    private final AppUserRepository appUserRepository;

    public AppUserService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
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
}
