package com.crawmacncheese.spring_boot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BookmarkCrudTests {

    @Value("${local.server.port}")
    private int port;

    private record AuthResult(String email, String token) {}

    private AuthResult registerAndLogin(HttpClient client, String baseUrl) throws Exception {
        String email = "alvin+" + System.currentTimeMillis() + "@example.com";
        String username = "alvin" + System.currentTimeMillis();
        String password = "supersecret123";

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
        assertEquals(email, JsonPath.read(registerRes.body(), "$.email"));
        assertTrue(!registerRes.body().contains("\"password\""));

        String loginBody = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        HttpRequest loginReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/auth/login"))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(loginBody))
                .build();
        HttpResponse<String> loginRes = client.send(loginReq, HttpResponse.BodyHandlers.ofString());
        assertTrue(loginRes.statusCode() >= 200 && loginRes.statusCode() < 300, "login response: " + loginRes.body());
        String token = JsonPath.read(loginRes.body(), "$.token");
        assertNotNull(token);
        assertTrue(!token.isBlank());

        return new AuthResult(email, token);
    }

    @Test
    void bookmark_crud_happy_path() throws Exception {
        String baseUrl = "http://localhost:" + port;
        HttpClient client = HttpClient.newHttpClient();
        AuthResult auth = registerAndLogin(client, baseUrl);

        // CREATE
        String url = "https://example.com/articles/123?utm_source=test&b=2&a=1";
        String createBody = """
                {"url":"%s","tags":["reading","java"],"priority":2}
                """.formatted(url);

        HttpRequest createReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks"))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .header("Authorization", "Bearer " + auth.token())
                .POST(HttpRequest.BodyPublishers.ofString(createBody))
                .build();
        HttpResponse<String> createRes = client.send(createReq, HttpResponse.BodyHandlers.ofString());
        assertTrue(createRes.statusCode() == 201 || createRes.statusCode() == 200, "create response: " + createRes.body());
        Integer bookmarkId = JsonPath.read(createRes.body(), "$.id");
        assertNotNull(bookmarkId);
        assertEquals(url, JsonPath.read(createRes.body(), "$.url"));

        // LIST
        HttpRequest listReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks"))
                .header("Authorization", "Bearer " + auth.token())
                .GET()
                .build();
        HttpResponse<String> listRes = client.send(listReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, listRes.statusCode(), "list response: " + listRes.body());
        List<Integer> ids = JsonPath.read(listRes.body(), "$[*].id");
        assertTrue(ids.contains(bookmarkId), "list should include created bookmark; got ids=" + ids);

        // GET
        HttpRequest getReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks/" + bookmarkId))
                .header("Authorization", "Bearer " + auth.token())
                .GET()
                .build();
        HttpResponse<String> getRes = client.send(getReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, getRes.statusCode(), "get response: " + getRes.body());
        assertEquals(bookmarkId, JsonPath.read(getRes.body(), "$.id"));
        assertEquals(url, JsonPath.read(getRes.body(), "$.url"));

        // SNAPSHOT: upload HTML then fetch it
        String html = "<html><body><h1>Hello snapshot</h1></body></html>";
        HttpRequest putSnapReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks/" + bookmarkId + "/snapshot"))
                .header("Content-Type", MediaType.TEXT_HTML_VALUE)
                .header("Authorization", "Bearer " + auth.token())
                .PUT(HttpRequest.BodyPublishers.ofString(html))
                .build();
        HttpResponse<String> putSnapRes = client.send(putSnapReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, putSnapRes.statusCode(), "snapshot put response: " + putSnapRes.body());
        assertEquals("READY", JsonPath.read(putSnapRes.body(), "$.snapshotStatus"));

        HttpRequest getSnapReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks/" + bookmarkId + "/snapshot"))
                .header("Authorization", "Bearer " + auth.token())
                .GET()
                .build();
        HttpResponse<String> getSnapRes = client.send(getSnapReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, getSnapRes.statusCode(), "snapshot get response: " + getSnapRes.body());
        assertTrue(getSnapRes.body().contains("Hello snapshot"));

        // UPDATE (partial)
        String updateBody = """
                {"title":"Updated title","tags":["updated"],"priority":5}
                """;
        HttpRequest updateReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks/" + bookmarkId))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .header("Authorization", "Bearer " + auth.token())
                .PUT(HttpRequest.BodyPublishers.ofString(updateBody))
                .build();
        HttpResponse<String> updateRes = client.send(updateReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, updateRes.statusCode(), "update response: " + updateRes.body());
        assertEquals("Updated title", JsonPath.read(updateRes.body(), "$.title"));
        assertEquals(5, (int) JsonPath.read(updateRes.body(), "$.priority"));

        // DELETE
        HttpRequest deleteReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks/" + bookmarkId))
                .header("Authorization", "Bearer " + auth.token())
                .DELETE()
                .build();
        HttpResponse<String> deleteRes = client.send(deleteReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(204, deleteRes.statusCode(), "delete response: " + deleteRes.body());

        // GET after delete => 404
        HttpResponse<String> getAfterDeleteRes = client.send(getReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(404, getAfterDeleteRes.statusCode(), "get-after-delete response: " + getAfterDeleteRes.body());
    }

    @Test
    void bookmarks_require_authentication() throws Exception {
        String baseUrl = "http://localhost:" + port;
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest listReq = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/bookmarks"))
                .GET()
                .build();
        HttpResponse<String> listRes = client.send(listReq, HttpResponse.BodyHandlers.ofString());
        assertTrue(listRes.statusCode() == 401 || listRes.statusCode() == 403, "unauth list response: " + listRes.body());
    }
}

