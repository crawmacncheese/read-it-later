package com.crawmacncheese.spring_boot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.jayway.jsonpath.JsonPath;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthFlowTests {

    @Value("${local.server.port}")
    private int port;

    @Test
    void register_login_and_access_profile() throws Exception {
        String baseUrl = "http://localhost:" + port;
        String email = "alvin+" + System.currentTimeMillis() + "@example.com";
        String username = "alvin";
        String password = "supersecret123";

        HttpClient client = HttpClient.newHttpClient();

        // register
        String registerBody = """
                {"username":"%s","email":"%s","password":"%s"}
                """.formatted(username, email, password);
        HttpRequest registerReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/auth/register"))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(registerBody))
                .build();
        HttpResponse<String> registerRes = client.send(registerReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, registerRes.statusCode(), "register response: " + registerRes.body());
        assertNotNull(registerRes.body());
        String registeredEmail = JsonPath.read(registerRes.body(), "$.email");
        assertNotNull(registeredEmail, "register response missing $.email: " + registerRes.body());
        assertEquals(email, registeredEmail, "register response: " + registerRes.body());
        // Password should never be returned (even hashed)
        assertTrue(!registerRes.body().contains("\"password\""));

        // login
        String loginBody = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        HttpRequest loginReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/auth/login"))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(loginBody))
                .build();
        HttpResponse<String> loginRes = client.send(loginReq, HttpResponse.BodyHandlers.ofString());
        assertTrue(loginRes.statusCode() >= 200 && loginRes.statusCode() < 300);
        assertNotNull(loginRes.body());

        String token = JsonPath.read(loginRes.body(), "$.token");
        assertNotNull(token);
        assertTrue(!token.isBlank());
        assertEquals(email, JsonPath.read(loginRes.body(), "$.user.email"));
        assertTrue(!loginRes.body().contains("\"password\""));

        // profile with token should succeed
        HttpRequest profileReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/users/profile"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        HttpResponse<String> profileOk = client.send(profileReq, HttpResponse.BodyHandlers.ofString());
        assertTrue(profileOk.statusCode() >= 200 && profileOk.statusCode() < 300);
        assertNotNull(profileOk.body());
        assertEquals(email, JsonPath.read(profileOk.body(), "$.email"));
        assertTrue(!profileOk.body().contains("\"password\""));

        // profile without token should be blocked (401 or 403 depending on config)
        HttpRequest blockedReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/users/profile"))
                .GET()
                .build();
        HttpResponse<String> profileBlocked = client.send(blockedReq, HttpResponse.BodyHandlers.ofString());
        assertTrue(profileBlocked.statusCode() >= 400 && profileBlocked.statusCode() < 500);
    }
}

