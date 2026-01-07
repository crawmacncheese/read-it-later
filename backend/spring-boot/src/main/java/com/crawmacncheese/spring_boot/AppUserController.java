package com.crawmacncheese.spring_boot;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;



@RestController
@RequestMapping("api/v1/users")
public class AppUserController {

    private final AppUserService appUserService;

    
    public AppUserController(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @GetMapping
    public List<AppUser> getUsers() {
        return appUserService.getAllAppUsers();
    }

    @GetMapping("{id}")
    public AppUser getUsersById(@PathVariable Integer id) {
        return appUserService.getAppUserById(id);
    
    }

    @PostMapping
    public void addNewAppUser(@RequestBody AppUser appUser) {
        appUserService.insertAppUser(appUser);
    }
}
