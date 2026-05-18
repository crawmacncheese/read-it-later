"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { fetchSnapshot, getBookmark, requestSnapshot } from "@/lib/api";
import { pollUntilSnapshotSettled } from "@/lib/snapshot-poll";
import { cacheGet, cacheSet } from "@/lib/offline-cache";
import type { BookmarkDetail } from "@/lib/types";

const actionBtnClass =
  "rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50";

function SnapshotActions({
  bookmark,
  token,
  busy,
  offlineCopy,
  onGenerate,
  onOpen,
}: {
  bookmark: BookmarkDetail;
  token: string | null;
  busy: boolean;
  offlineCopy: boolean;
  onGenerate: () => void;
  onOpen: () => void;
}) {
  const status = bookmark.snapshotStatus;

  if (offlineCopy) {
    return (
      <span className="text-xs text-white/50" title="Snapshots need a live connection">
        Snapshot unavailable offline
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
        cacheSet(`bookmark:${d.id}`, d).catch(() => {});
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Failed to load";
        cacheGet<BookmarkDetail>(`bookmark:${id}`)
          .then((cached) => {
            if (cancelled) return;
            if (cached?.value) {
              setData(cached.value);
              setOfflineCopy(true);
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
        toast({ title: "Snapshot ready", variant: "success" });
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
    if (!token || data?.snapshotStatus !== "READY") return;
    setSnapshotBusy(true);
    try {
      const html = await fetchSnapshot(token, id);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        URL.revokeObjectURL(url);
        toast({
          title: "Popup blocked",
          message: "Allow popups for this site to open the snapshot.",
          variant: "error",
        });
        return;
      }
      // Revoke after a delay so the new tab can load the blob URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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