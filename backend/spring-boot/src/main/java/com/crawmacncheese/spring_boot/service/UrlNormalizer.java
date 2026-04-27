package com.crawmacncheese.spring_boot.service;

import java.net.IDN;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

/**
 * Normalizes URLs so that common variants map to the same canonical string:
 * - http/https treated as the same (canonicalize to https)
 * - removes trailing slash (except "/")
 * - removes common tracking query params (utm_*, fbclid, gclid, etc.)
 * - sorts remaining query params for stable equality
 */
@Component
public class UrlNormalizer {

    private static final Set<String> DROP_QUERY_KEYS = Set.of(
            "fbclid",
            "gclid",
            "igshid",
            "mc_cid",
            "mc_eid"
    );

    public String canonicalize(String rawUrl) {
        if (rawUrl == null) return null;
        String trimmed = rawUrl.trim();
        if (trimmed.isBlank()) return trimmed;

        URI uri = URI.create(trimmed);

        String host = uri.getHost();
        // Some inputs like "example.com/path" don't parse as a URI host; require scheme in MVP
        if (host == null) {
            // Try again by assuming https
            uri = URI.create("https://" + trimmed);
            host = uri.getHost();
        }

        String scheme = "https"; // treat http/https as same by forcing https
        String normalizedHost = host == null ? null : IDN.toASCII(host.toLowerCase(Locale.ROOT));

        int port = uri.getPort();
        boolean defaultPort = port == -1 || port == 80 || port == 443;
        int normalizedPort = defaultPort ? -1 : port;

        String path = uri.getRawPath();
        if (path == null || path.isBlank()) path = "/";
        if (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }

        String query = normalizeQuery(uri.getRawQuery());

        try {
            URI out = new URI(
                    scheme,
                    uri.getRawUserInfo(),
                    normalizedHost,
                    normalizedPort,
                    path,
                    query,
                    null // drop fragment
            );
            return out.toString();
        } catch (Exception e) {
            // If we can't normalize, fall back to trimmed input (still lets user save).
            return trimmed;
        }
    }

    private String normalizeQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) return null;

        Map<String, List<String>> params = new LinkedHashMap<>();
        for (String pair : rawQuery.split("&")) {
            if (pair.isBlank()) continue;
            String[] parts = pair.split("=", 2);
            String key = urlDecode(parts[0]);
            String value = parts.length > 1 ? urlDecode(parts[1]) : "";

            if (key == null) continue;
            String lowerKey = key.toLowerCase(Locale.ROOT);
            if (lowerKey.startsWith("utm_")) continue;
            if (DROP_QUERY_KEYS.contains(lowerKey)) continue;

            params.computeIfAbsent(key, __ -> new ArrayList<>()).add(value);
        }

        if (params.isEmpty()) return null;

        // stable ordering
        var entries = new ArrayList<>(params.entrySet());
        entries.sort(Comparator.comparing(Map.Entry::getKey));

        List<String> normalizedPairs = new ArrayList<>();
        for (var e : entries) {
            var values = e.getValue();
            values.sort(String::compareTo);
            for (String v : values) {
                normalizedPairs.add(urlEncode(e.getKey()) + "=" + urlEncode(v));
            }
        }
        return String.join("&", normalizedPairs);
    }

    private String urlDecode(String s) {
        if (s == null) return null;
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }

    private String urlEncode(String s) {
        // application/x-www-form-urlencoded style, then make spaces %20 (not '+')
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }
}

