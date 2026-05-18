"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { getBookmark, requestSnapshot } from "@/lib/api";
import { bookmarkCacheKey, cacheGet, cacheSet, snapshotCacheKey } from "@/lib/offline-cache";
import {
  hasCachedSnapshot,
  loadSnapshotHtml,
  openSnapshotHtmlInNewTab,
  prefetchSnapshotHtml,
} from "@/lib/snapshot-offline";
import { pollUntilSnapshotSettled } from "@/lib/snapshot-poll";
import type { BookmarkDetail } from "@/lib/types";

const actionBtnClass =
  "rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50";

function SnapshotActions({
  bookmark,
  token,
  busy,
  offlineCopy,
  hasCachedSnapshotHtml,
  onGenerate,
  onOpen,
}: {
  bookmark: BookmarkDetail;
  token: string | null;
  busy: boolean;
  offlineCopy: boolean;
  hasCachedSnapshotHtml: boolean;
  onGenerate: () => void;
  onOpen: () => void;
}) {
  const status = bookmark.snapshotStatus;

  if (offlineCopy) {
    if (status === "READY" && hasCachedSnapshotHtml) {
      return (
        <button type="button" className={actionBtnClass} disabled={busy} onClick={onOpen}>
          {busy ? "Opening…" : "Open offline snapshot"}
        </button>
      );
    }
    return (
      <span className="text-xs text-white/50" title="Generate a snapshot while online to read it offline later">
        {status === "READY"
          ? "Snapshot not saved for offline"
          : "Snapshot unavailable offline"}
      </span>
    );
  }

  if (status === "READY") {
    return (
      <button type="button" className={actionBtnClass} disabled={busy || !token} onClick={onOpen}>
        {busy ? "Opening…" : "Open snapshot"}
      </button>
    );
  }

  if (status === "PENDING" || busy) {
    return (
      <button type="button" className={actionBtnClass} disabled>
        Generating snapshot…
      </button>
    );
  }

  if (status === "FAILED") {
    return (
      <button type="button" className={actionBtnClass} disabled={busy || !token} onClick={onGenerate}>
        {busy ? "Retrying…" : "Retry snapshot"}
      </button>
    );
  }

  return (
    <button type="button" className={actionBtnClass} disabled={busy || !token} onClick={onGenerate}>
      {busy ? "Starting…" : "Generate snapshot"}
    </button>
  );
}

export default function BookmarkDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<BookmarkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineCopy, setOfflineCopy] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [hasCachedSnapshotHtml, setHasCachedSnapshotHtml] = useState(false);

  const pollInFlight = useRef(false);
  const pollCancelRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOfflineCopy(false);
    getBookmark(token, id)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        cacheSet(bookmarkCacheKey(d.id), d).catch(() => {});
        if (d.snapshotStatus === "READY" && token) {
          void prefetchSnapshotHtml(token, d.id).then((ok) => {
            if (!cancelled && ok) setHasCachedSnapshotHtml(true);
          });
        }
        void hasCachedSnapshot(d.id).then((ok) => {
          if (!cancelled) setHasCachedSnapshotHtml(ok);
        });
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Failed to load";
        cacheGet<BookmarkDetail>(bookmarkCacheKey(id))
          .then(async (cached) => {
            if (cancelled) return;
            if (cached?.value) {
              setData(cached.value);
              setOfflineCopy(true);
              const snapshotOk = await hasCachedSnapshot(id);
              if (!cancelled) setHasCachedSnapshotHtml(snapshotOk);
              toast({
                title: "Offline copy",
                message: "Showing a cached version of this bookmark.",
                variant: "info",
              });
              return;
            }
            setError(message);
            toast({ title: "Failed to load", message, variant: "error" });
          })
          .catch(() => {
            if (cancelled) return;
            setError(message);
            toast({ title: "Failed to load", message, variant: "error" });
          });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id, toast]);

  const runSnapshotPoll = useCallback(async () => {
    if (!token || !Number.isFinite(id) || pollInFlight.current) return;
    pollInFlight.current = true;
    pollCancelRef.current = false;
    setSnapshotBusy(true);

    try {
      const { bookmark, outcome } = await pollUntilSnapshotSettled(
        token,
        id,
        setData,
        () => pollCancelRef.current
      );

      if (outcome === "ready") {
        const cached = await prefetchSnapshotHtml(token, id);
        setHasCachedSnapshotHtml(cached);
        toast({
          title: "Snapshot ready",
          message: cached ? "Saved for offline reading." : undefined,
          variant: "success",
        });
      } else if (outcome === "failed") {
        toast({
          title: "Snapshot failed",
          message: bookmark.snapshotError ?? "Unknown error",
          variant: "error",
        });
      } else if (outcome === "timeout") {
        toast({
          title: "Snapshot timed out",
          message: "Still processing. Refresh the page in a moment.",
          variant: "info",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Snapshot poll failed";
      toast({ title: "Snapshot failed", message, variant: "error" });
    } finally {
      pollInFlight.current = false;
      setSnapshotBusy(false);
    }
  }, [token, id, toast]);

  // Resume polling if user lands on a bookmark already in PENDING.
  useEffect(() => {
    if (loading || offlineCopy || !token || !data) return;
    if (data.snapshotStatus !== "PENDING") return;
    void runSnapshotPoll();
  }, [loading, offlineCopy, token, data?.id, data?.snapshotStatus, runSnapshotPoll]);

  useEffect(() => {
    return () => {
      pollCancelRef.current = true;
    };
  }, []);

  const handleGenerateSnapshot = async () => {
    if (!token || pollInFlight.current) return;
    setSnapshotBusy(true);
    try {
      const updated = await requestSnapshot(token, id);
      setData(updated);
      await runSnapshotPoll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start snapshot";
      toast({ title: "Could not start snapshot", message, variant: "error" });
      setSnapshotBusy(false);
    }
  };

  const handleOpenSnapshot = async () => {
    if (data?.snapshotStatus !== "READY") return;
    if (!offlineCopy && !token) return;
    setSnapshotBusy(true);
    try {
      let html: string;
      let source: "network" | "cache" = "cache";

      if (offlineCopy) {
        const cached = await cacheGet<string>(snapshotCacheKey(id));
        if (!cached?.value) {
          throw new Error("No offline snapshot saved for this bookmark");
        }
        html = cached.value;
      } else {
        const loaded = await loadSnapshotHtml(token!, id);
        html = loaded.html;
        source = loaded.source;
        if (source === "network") setHasCachedSnapshotHtml(true);
      }

      const opened = openSnapshotHtmlInNewTab(html);
      if (!opened) {
        toast({
          title: "Popup blocked",
          message: "Allow popups for this site to open the snapshot.",
          variant: "error",
        });
        return;
      }
      if (source === "cache") {
        toast({
          title: "Offline snapshot",
          message: "Opened from local cache.",
          variant: "info",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open snapshot";
      toast({ title: "Could not open snapshot", message, variant: "error" });
    } finally {
      setSnapshotBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/app/library" className="text-sm text-white/70 hover:underline">
          ← Back to Library
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {data && !loading && !error ? (
            <SnapshotActions
              bookmark={data}
              token={token}
              busy={snapshotBusy}
              offlineCopy={offlineCopy}
              hasCachedSnapshotHtml={hasCachedSnapshotHtml}
              onGenerate={() => void handleGenerateSnapshot()}
              onOpen={() => void handleOpenSnapshot()}
            />
          ) : null}
          {data?.url ? (
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className={actionBtnClass}
            >
              Open original
            </a>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          Loading…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      ) : !data ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          Not found.
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
          {offlineCopy ? (
            <div className="mb-4 rounded-lg border border-yellow-400/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              You’re viewing an offline cached copy.
            </div>
          ) : null}
          <h1 className="text-xl font-semibold">{data.title ?? data.url}</h1>
          {data.tags?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {data.snapshotStatus === "FAILED" && data.snapshotError ? (
            <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
              {data.snapshotError}
            </div>
          ) : null}
          <div className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/85">
            {data.content ?? "No extracted content yet (MVP)."}
          </div>
        </div>
      )}
    </div>
  );
}