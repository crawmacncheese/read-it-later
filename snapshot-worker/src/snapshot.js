import { chromium } from "playwright";
import {
  FETCH_FUNCTION_NAME,
  RESOLVE_FETCH_FUNCTION_NAME,
  REJECT_FETCH_FUNCTION_NAME,
  getHookScriptSource,
  getPageDataScriptSource,
  getScriptSource,
  getZipScriptSource,
} from "single-file-cli/lib/single-file-script.js";
import { arrayBufferToBase64 } from "single-file-cli/lib/cdp-client-util.js";

const SINGLE_FILE_WORLD_NAME = "singlefile";
const SET_SCREENSHOT_FUNCTION_NAME = "setScreenshot";
const SET_PDF_FUNCTION_NAME = "setPDF";
const SET_PAGE_DATA_FUNCTION_NAME = "setPageData";
const CAPTURE_SCREENSHOT_FUNCTION_NAME = "captureScreenshot";
const PRINT_TO_PDF_FUNCTION_NAME = "printToPDF";

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
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

/** Strip optional "Bearer " prefix; ensure compact JWS shape (three segments). */
function normalizeBearerJwt(raw) {
  let s = String(raw).trim();
  if (/^bearer\s+/i.test(s)) {
    s = s.replace(/^bearer\s+/i, "").trim();
  }
  if (!s) {
    throw new Error(
      "AUTH_TOKEN is empty. Set AUTH_TOKEN or pass --token <jwt> (the access token from login, with two dots / three segments)."
    );
  }
  const parts = s.split(".");
  if (parts.length !== 3 || parts.some((p) => !p.length)) {
    throw new Error(
      "AUTH_TOKEN must be a compact JWT (header.payload.signature). " +
        "If you used `--token` without a value, put the token after it, or set AUTH_TOKEN."
    );
  }
  return s;
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

async function callBrowserFunction(cdp, contextId, functionName, args) {
  const serializedArgs = args.map((a) => JSON.stringify(a)).join(", ");
  await cdp.send("Runtime.evaluate", {
    expression: `globalThis.${functionName}(${serializedArgs})`,
    contextId,
  });
}

/**
 * SingleFile's own CDP path injects the bundle into an isolated world named "singlefile".
 * Playwright's page.evaluate runs in the main world, so it never sees `globalThis.singlefile`.
 * Mirror lib/cdp-client.js: hook in default world, bundle in "singlefile", bindings + evaluate with contextId.
 */
async function captureWithSingleFileCdpAfterPage(page, targetUrl, getPageDataOptions) {
  const cdp = await page.context().newCDPSession(page);
  const sfContexts = [];

  const onExecutionContextCreated = (params) => {
    const ctx = params.context;
    if (ctx.name === SINGLE_FILE_WORLD_NAME && ctx.auxData?.frameId) {
      sfContexts.push({ id: ctx.id, frameId: ctx.auxData.frameId });
    }
  };

  let pageDataResponse = "";
  let resolvePageData;
  let rejectPageData;
  const pageDataPromise = new Promise((resolve, reject) => {
    resolvePageData = resolve;
    rejectPageData = reject;
  });

  const onBindingCalled = async (params) => {
    try {
      if (params.name === SET_PAGE_DATA_FUNCTION_NAME) {
        const chunk = params.payload;
        if (chunk.length) {
          pageDataResponse += chunk;
        } else {
          const parsed = JSON.parse(pageDataResponse);
          if (parsed.content instanceof Array) {
            parsed.content = new Uint8Array(parsed.content);
          }
          resolvePageData(parsed);
        }
        return;
      }
      if (params.name === FETCH_FUNCTION_NAME) {
        const { payload, executionContextId } = params;
        const { requestId, url: reqUrl, options: fetchOptions } = JSON.parse(payload);
        try {
          const response = await fetch(reqUrl, fetchOptions);
          const arrayBuffer = await response.arrayBuffer();
          const base64Data = arrayBufferToBase64(arrayBuffer);
          const result = {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data: base64Data,
          };
          await callBrowserFunction(cdp, executionContextId, RESOLVE_FETCH_FUNCTION_NAME, [requestId, result]);
        } catch (error) {
          const errorResult = {
            error: error.message,
            code: error.code,
          };
          await callBrowserFunction(cdp, executionContextId, REJECT_FETCH_FUNCTION_NAME, [requestId, errorResult]);
        }
      }
    } catch (e) {
      rejectPageData(e);
    }
  };

  try {
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    cdp.on("Runtime.executionContextCreated", onExecutionContextCreated);
    cdp.on("Runtime.bindingCalled", onBindingCalled);

    await cdp.send("Page.setBypassCSP", { enabled: true });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: getHookScriptSource(),
      runImmediately: true,
    });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: await getScriptSource({}),
      worldName: SINGLE_FILE_WORLD_NAME,
      runImmediately: true,
    });

    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60_000 });

    const { frameTree } = await cdp.send("Page.getFrameTree");
    const mainFrameId = frameTree.frame.id;
    const matches = sfContexts.filter((c) => c.frameId === mainFrameId);
    if (!matches.length) {
      throw new Error(
        `No SingleFile isolated context for main frame (got ${sfContexts.length} other contexts). ` +
          "Injection may have failed or the page replaced the main frame before capture."
      );
    }
    const contextId = matches[matches.length - 1].id;

    await cdp.send("Runtime.addBinding", {
      name: SET_PAGE_DATA_FUNCTION_NAME,
      executionContextId: contextId,
    });
    await cdp.send("Runtime.addBinding", {
      name: FETCH_FUNCTION_NAME,
      executionContextId: contextId,
    });

    const captureScript = `(${getPageDataScriptSource.toString()})(${JSON.stringify(getPageDataOptions)},${JSON.stringify([
      SET_SCREENSHOT_FUNCTION_NAME,
      SET_PDF_FUNCTION_NAME,
      SET_PAGE_DATA_FUNCTION_NAME,
      CAPTURE_SCREENSHOT_FUNCTION_NAME,
      PRINT_TO_PDF_FUNCTION_NAME,
    ])})`;

    const evalPromise = cdp.send("Runtime.evaluate", {
      expression: captureScript,
      awaitPromise: true,
      returnByValue: true,
      contextId,
    });

    const [pageData, evalResult] = await Promise.all([pageDataPromise, evalPromise]);

    if (evalResult?.exceptionDetails) {
      throw new Error(evalResult.exceptionDetails.exception?.description ?? "Runtime.evaluate failed");
    }
    if (evalResult?.result?.subtype === "error") {
      throw new Error(evalResult.result.description ?? "Capture script error");
    }

    return pageData;
  } finally {
    cdp.off("Runtime.executionContextCreated", onExecutionContextCreated);
    cdp.off("Runtime.bindingCalled", onBindingCalled);
    await cdp.detach().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.url ?? requireEnv("SNAPSHOT_URL");
  const bookmarkId = Number(args.bookmarkId ?? requireEnv("BOOKMARK_ID"));
  const apiBaseUrl = args.apiBaseUrl ?? requireEnv("API_BASE_URL");
  const tokenRaw =
    typeof args.token === "string" && args.token.length > 0 ? args.token : requireEnv("AUTH_TOKEN");
  const token = normalizeBearerJwt(tokenRaw);

  if (!Number.isFinite(bookmarkId)) {
    throw new Error("bookmarkId must be a number");
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-web-security"],
  });

  try {
    const page = await browser.newPage();

    const getPageDataOptions = {
      zipScript: getZipScriptSource(),
      blockImages: false,
      blockScripts: false,
      compressHTML: false,
      removeHiddenElements: false,
      removeUnusedStyles: false,
    };

    const pageData = await captureWithSingleFileCdpAfterPage(page, url, getPageDataOptions);

    if (!pageData?.content || typeof pageData.content !== "string") {
      throw new Error("SingleFile did not return HTML content");
    }

    const result = await uploadSnapshot({
      apiBaseUrl,
      token,
      bookmarkId,
      html: pageData.content,
    });

    process.stdout.write(JSON.stringify({ ok: true, bookmarkId, snapshot: result }, null, 2) + "\n");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + "\n");
  process.exit(1);
});
