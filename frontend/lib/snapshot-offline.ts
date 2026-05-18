import { fetchSnapshot } from "@/lib/api";
import {
  bookmarkCacheKey,
  cacheDelete,
  cacheGet,
  cacheSet,
  snapshotCacheKey,
} from "@/lib/offline-cache";

export type SnapshotHtmlSource = "network" | "cache";

/** Persist snapshot HTML after a successful download (best-effort). */
export async function cacheSnapshotHtml(bookmarkId: number, html: string): Promise<void> {
  try {
    await cacheSet(snapshotCacheKey(bookmarkId), html);
  } catch {
    // QuotaExceededError or private mode — offline open may still work online later.
  }
}

export async function hasCachedSnapshot(bookmarkId: number): Promise<boolean> {
  const entry = await cacheGet<string>(snapshotCacheKey(bookmarkId));
  return Boolean(entry?.value);
}

/** Download snapshot when online and store locally for offline reading. */
export async function prefetchSnapshotHtml(
  token: string,
  bookmarkId: number
): Promise<boolean> {
  try {
    const html = await fetchSnapshot(token, bookmarkId);
    await cacheSnapshotHtml(bookmarkId, html);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer network (and refresh cache); fall back to IndexedDB when offline or request fails.
 */
export async function loadSnapshotHtml(
  token: string,
  bookmarkId: number
): Promise<{ html: string; source: SnapshotHtmlSource }> {
  try {
    const html = await fetchSnapshot(token, bookmarkId);
    await cacheSnapshotHtml(bookmarkId, html);
    return { html, source: "network" };
  } catch (networkError) {
    const cached = await cacheGet<string>(snapshotCacheKey(bookmarkId));
    if (cached?.value) {
      return { html: cached.value, source: "cache" };
    }
    throw networkError;
  }
}

export function openSnapshotHtmlInNewTab(html: string): boolean {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export async function clearBookmarkOfflineData(bookmarkId: number): Promise<void> {
  await Promise.all([
    cacheDelete(bookmarkCacheKey(bookmarkId)),
    cacheDelete(snapshotCacheKey(bookmarkId)),
  ]);
}
