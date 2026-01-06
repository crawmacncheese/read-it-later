package com.crawmacncheese.spring_boot;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("api/v1/users")
public class UserController {
    
    @GetMapping
    public List<User> getUsers() {
        return List.of(
            new User(1, "alvin135", "crawmacncheese"),
            new User(2, "portasfundos", "kiranai")
        );
    }
}
