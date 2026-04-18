package com.crawmacncheese.spring_boot.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.crawmacncheese.spring_boot.dto.AppUserDTO;
import com.crawmacncheese.spring_boot.model.AppUser;

@Mapper(componentModel = "spring")
public interface AppUserMapper {

    @Mapping(target = "roles", expression = "java(getRolesOrDefault(appUser.getRoles()))")
    AppUserDTO toDto(AppUser appUser);

    // Helper method to provide default role
    default String getRolesOrDefault(String roles) {
        return (roles == null || roles.isEmpty()) ? "ROLE_USER" : roles;
    }
}
