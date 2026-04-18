package com.crawmacncheese.spring_boot.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.crawmacncheese.spring_boot.dto.AppUserDTO;
import com.crawmacncheese.spring_boot.mappers.AppUserMapper;
import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.repository.AppUserRepository;
import com.crawmacncheese.spring_boot.security.AppUserDetails;

@Service
public class UserInfoService implements UserDetailsService {

    private final AppUserRepository repository;
    private final PasswordEncoder encoder;
    private final AppUserMapper appUserMapper;

    @Autowired
    public UserInfoService(AppUserRepository repository, PasswordEncoder encoder, AppUserMapper appUserMapper) {
        this.repository = repository;
        this.encoder = encoder;
        this.appUserMapper = appUserMapper;
    }

    // Method to load user details by username (email)
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Fetch user from the database by email (username)
        Optional<AppUser> userInfo = repository.findByEmail(username);
        
        if (userInfo.isEmpty()) {
            throw new UsernameNotFoundException("User not found with email: " + username);
        }
        
        // Convert UserInfo to UserDetails (UserInfoDetails)
        AppUser user = userInfo.get();
        AppUserDTO userDTO = appUserMapper.toDto(user); // convert entity to DTO
        return new AppUserDetails(userDTO);
        // return new User(user.getEmail(), user.getPassword(), user.getRoles());
    }

    // Add any additional methods for registering or managing users
    public String addUser(AppUserDTO userDTO) {
        // Encrypt password before saving
        AppUser user = new AppUser();
        user.setEmail(userDTO.getEmail());
        user.setPassword(encoder.encode(userDTO.getPassword()));
        repository.save(user);
        return "User added successfully!";
    }
}
