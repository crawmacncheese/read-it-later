# Snapshot worker (Phase 3 - Part 1)

This worker generates a **SingleFile** snapshot (one self-contained HTML) using **Playwright**,
then uploads it to the Spring Boot backend via:

`PUT /api/v1/bookmarks/:id/snapshot` with `Content-Type: text/html`.

## Install

From `snapshot-worker/`:

```bash
npm install
npx playwright install chromium
```

## Run (CLI args)

```bash
API_BASE_URL="http://localhost:8080" \
AUTH_TOKEN="YOUR_JWT_HERE" \
BOOKMARK_ID="123" \
SNAPSHOT_URL="https://en.wikipedia.org/wiki/2016_NBA_draft" \
npm run snapshot
```

Or:

```bash
npm run snapshot -- --apiBaseUrl "http://localhost:8080" --token "YOUR_JWT_HERE" --bookmarkId 123 --url "https://example.com"
```

## Notes
- This is **Phase 3 Part 1**: a manually-run worker script.
- Phase 3 Part 2 will wire `POST /api/v1/bookmarks/:id/snapshot` to enqueue/trigger this worker automatically.

