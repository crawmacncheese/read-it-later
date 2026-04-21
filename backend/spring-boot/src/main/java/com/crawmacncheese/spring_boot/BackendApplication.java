package com.crawmacncheese.spring_boot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.crawmacncheese.spring_boot.security.JwtProperties;

@SpringBootApplication
@ConfigurationPropertiesScan(basePackageClasses = JwtProperties.class)
@RestController
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@GetMapping
	public String helloWorld() {
		return "HELLO";
	}

}
