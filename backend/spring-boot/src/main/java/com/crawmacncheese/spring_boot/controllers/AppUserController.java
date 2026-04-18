package com.crawmacncheese.spring_boot.controllers;
import java.util.List;
import java.util.Optional;

import org.apache.catalina.connector.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.crawmacncheese.spring_boot.dto.AppUserDTO;
import com.crawmacncheese.spring_boot.mappers.AppUserMapper;
import com.crawmacncheese.spring_boot.model.AppUser;
import com.crawmacncheese.spring_boot.security.AppUserDetails;
import com.crawmacncheese.spring_boot.service.AppUserService;




@RestController
@RequestMapping("api/v1/users")
public class AppUserController {

    private final AppUserService appUserService;
    private final AppUserMapper appUserMapper;

    
    public AppUserController(AppUserService appUserService, AppUserMapper appUserMapper) {
        this.appUserService = appUserService;
        this.appUserMapper = appUserMapper;
    }

    @GetMapping
    public List<AppUser> getUsers() {
        return appUserService.getAllAppUsers();
    }

    @GetMapping("{id}")
    public AppUser getUsersById(@PathVariable Integer id) {
        return appUserService.getAppUserById(id);
    
    }

    // @GetMapping("/profile")
    // public ResponseEntity<AppUserDTO> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
    //     // String username = userDetails.getUsername();
    //     // return appUserService.getAppUserByUsername(username)
    //     //     .map(user -> ResponseEntity.ok(appUserMapper.toDto(user)))
    //     //     .orElse(ResponseEntity.notFound().build());
    //     String username = userDetails.getUsername();
    //     Optional<AppUser> userOpt = appUserService.getAppUserByUsername(username);
    //     if (userOpt.isPresent()) {
    //         AppUser user = userOpt.get();
    //         AppUserDTO userDTO = appUserMapper.toDto(user);
    //         AppUserDetails appUserDetails = new AppUserDetails(userDTO);
    //         return ResponseEntity.ok(userDTO);
    //     } else {
    //         return ResponseEntity.notFound().build();
    //     }
    // }
    @GetMapping("/profile")
    public ResponseEntity<AppUserDTO> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        System.out.println(userDetails);
        if (userDetails == null) {
            // User is not authenticated
            return ResponseEntity.status(401).build(); // Unauthorized
        }
        String username = userDetails.getUsername();
        Optional<AppUser> userOpt = appUserService.getAppUserByEmail(username);
        if (userOpt.isPresent()) {
            AppUser user = userOpt.get();
            AppUserDTO userDTO = appUserMapper.toDto(user);
            AppUserDetails appUserDetails = new AppUserDetails(userDTO);
            // You can do more with appUserDetails if needed
            return ResponseEntity.ok(userDTO);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    

    @PostMapping
    public void addNewAppUser(@RequestBody AppUser appUser) {
        appUserService.insertAppUser(appUser);
    }
}
