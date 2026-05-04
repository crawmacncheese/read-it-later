import { chromium } from "playwright";
import {
  getHookScriptSource,
  getScriptSource,
  getZipScriptSource,
} from "single-file-cli/lib/single-file-script.js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = value;
  }
  return out;
}

async function uploadSnapshot({ apiBaseUrl, token, bookmarkId, html }) {
  const res = await fetch(`${apiBaseUrl}/api/v1/bookmarks/${bookmarkId}/snapshot`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/html",
    },
    body: html,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.url ?? requireEnv("SNAPSHOT_URL");
  const bookmarkId = Number(args.bookmarkId ?? requireEnv("BOOKMARK_ID"));
  const apiBaseUrl = args.apiBaseUrl ?? requireEnv("API_BASE_URL");
  const token = args.token ?? requireEnv("AUTH_TOKEN");

  if (!Number.isFinite(bookmarkId)) {
    throw new Error("bookmarkId must be a number");
  }

  const browser = await chromium.launch({
    headless: true,
    // Some sites require relaxed security to inline resources.
    args: ["--disable-web-security"],
  });

  try {
    const page = await browser.newPage();

    // SingleFile injection.
    await page.addInitScript({ content: getHookScriptSource() });
    await page.addInitScript({
      content: (await getScriptSource({})) + "; window.singlefile = singlefile;",
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

    const pageData = await page.evaluate(
      async (options) => await window.singlefile.getPageData(options),
      {
        zipScript: getZipScriptSource(),
        // MVP defaults: you can tune these later.
        blockImages: false,
        blockScripts: false,
        compressHTML: false,
        removeHiddenElements: false,
        removeUnusedStyles: false,
      }
    );

    if (!pageData?.content || typeof pageData.content !== "string") {
      throw new Error("SingleFile did not return HTML content");
    }

    const result = await uploadSnapshot({
      apiBaseUrl,
      token,
      bookmarkId,
      html: pageData.content,
    });

    // Print minimal output for debugging / scripting
    process.stdout.write(JSON.stringify({ ok: true, bookmarkId, snapshot: result }, null, 2) + "\n");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + "\n");
  process.exit(1);
});

