package com.crawmacncheese.spring_boot.dto;

import com.crawmacncheese.spring_boot.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@Getter
@Setter
@AllArgsConstructor
public class AppUserDTO {
    private Integer id;
    private String username;
    private String email;
    @JsonIgnore
    private String password;
    private String roles;

    // Custom setter for roles
    public void setRoles(String roles) {
        if (roles == null || roles.isEmpty()) {
            this.roles = "ROLE_USER";
        } else {
            this.roles = roles;
        }
    }

}
