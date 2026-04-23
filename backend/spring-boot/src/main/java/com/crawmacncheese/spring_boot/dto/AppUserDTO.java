package com.crawmacncheese.spring_boot.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
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
