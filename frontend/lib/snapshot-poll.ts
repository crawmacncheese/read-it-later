import { getBookmark } from "@/lib/api";
import type { BookmarkDetail } from "@/lib/types";

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_MS = 3 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SnapshotPollOutcome = "ready" | "failed" | "timeout" | "cancelled";

/**
 * Polls GET bookmark until snapshot settles or timeout.
 * Calls onUpdate on every fetch so the UI can refresh.
 */
export async function pollUntilSnapshotSettled(
  token: string,
  bookmarkId: number,
  onUpdate: (bookmark: BookmarkDetail) => void,
  isCancelled: () => boolean
): Promise<{ bookmark: BookmarkDetail; outcome: SnapshotPollOutcome }> {
  const deadline = Date.now() + POLL_MAX_MS;

  while (Date.now() < deadline) {
    if (isCancelled()) {
      return { bookmark: await getBookmark(token, bookmarkId), outcome: "cancelled" };
    }

    const bookmark = await getBookmark(token, bookmarkId);
    onUpdate(bookmark);

    if (bookmark.snapshotStatus === "READY") {
      return { bookmark, outcome: "ready" };
    }
    if (bookmark.snapshotStatus === "FAILED") {
      return { bookmark, outcome: "failed" };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  if (isCancelled()) {
    return { bookmark: await getBookmark(token, bookmarkId), outcome: "cancelled" };
  }

  const bookmark = await getBookmark(token, bookmarkId);
  onUpdate(bookmark);
  if (bookmark.snapshotStatus === "READY") {
    return { bookmark, outcome: "ready" };
  }
  if (bookmark.snapshotStatus === "FAILED") {
    return { bookmark, outcome: "failed" };
  }
  return { bookmark, outcome: "timeout" };
}
