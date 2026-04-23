package com.crawmacncheese.spring_boot.mappers;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import com.crawmacncheese.spring_boot.dto.AppUserDTO;
import com.crawmacncheese.spring_boot.model.AppUser;

/**
 * Fallback mapper implementation used as the primary Spring bean.
 * Keeps the API responses stable even if MapStruct generation is flaky
 * in a given environment.
 */
@Primary
@Component
public class AppUserMapperSpring implements AppUserMapper {

    @Override
    public AppUserDTO toDto(AppUser appUser) {
        if (appUser == null) return null;

        AppUserDTO dto = new AppUserDTO();
        dto.setId(appUser.getId());
        dto.setUsername(appUser.getUsername());
        dto.setEmail(appUser.getEmail());
        dto.setRoles((appUser.getRoles() == null || appUser.getRoles().isBlank()) ? "ROLE_USER" : appUser.getRoles());
        // Never expose password hashes
        dto.setPassword(null);
        return dto;
    }
}

