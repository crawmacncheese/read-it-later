package com.crawmacncheese.spring_boot.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.crawmacncheese.spring_boot.dto.AppUserDTO;
import com.crawmacncheese.spring_boot.model.AppUser;

@Mapper(componentModel = "default")
public interface AppUserMapper {

    @Mapping(target = "password", ignore = true)
    @Mapping(target = "roles", source = "roles", qualifiedByName = "rolesOrDefault")
    AppUserDTO toDto(AppUser appUser);

    @Named("rolesOrDefault")
    default String rolesOrDefault(String roles) {
        return (roles == null || roles.isBlank()) ? "ROLE_USER" : roles;
    }
}
