package com.crawmacncheese.spring_boot.security;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.crawmacncheese.spring_boot.AllArgsConstructor;
import com.crawmacncheese.spring_boot.dto.AppUserDTO;

import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
public class AppUserDetails implements UserDetails {

    private String username; // Changed from 'name' to 'email' for clarity
    private String password;
    private List<GrantedAuthority> authorities;

    public AppUserDetails(AppUserDTO userInfo) {
        this.username = userInfo.getEmail(); // Use email as username
        this.password = userInfo.getPassword();
        this.authorities = List.of(userInfo.getRoles().split(","))
                .stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    @Override
    public String toString() {
        return "AppUserDetails{" +
                "username='" + getUsername() + '\'' +
                ", roles='" + getAuthorities() + '\'' +
                '}';
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public String getPassword() {
        return password;
    }
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
