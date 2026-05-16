"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { getBookmark, requestSnapshot } from "@/lib/api";
import { cacheGet, cacheSet } from "@/lib/offline-cache";
import type { BookmarkDetail } from "@/lib/types";

export default function BookmarkDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token } = useAuth();
  const { toast } = useToast();
  const maxPollingTime = 1000 * 60 * 3;
  const pollingInterval = 1000;

  const [data, setData] = useState<BookmarkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineCopy, setOfflineCopy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        cacheSet(`bookmark:${d.id}`, d).catch(() => {
          /* ignore caching failures */
        });
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

  const sleep = (timeout: number): Promise<void> => {
    return new Promise((r) => setTimeout(r,timeout));
  }

  const handleSnapshotRequest = async () => {
    if (!token) return;
    setSubmitting(true);

    try {
      const snapshot = await requestSnapshot(token, id);
      setData(snapshot);
      for (let i = 0; i < maxPollingTime; i += pollingInterval) {
        const bookmark = await getBookmark(token, id);
        setData(bookmark);
        console.log(bookmark.snapshotStatus);
        console.log(bookmark.snapshotError);
        console.log(bookmark.snapshotObjectKey);
        console.log(bookmark.snapshotCreatedAt);
        if (bookmark.snapshotStatus === "READY" || bookmark.snapshotStatus === "FAILED") break;
        await sleep(pollingInterval);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
      toast({ title: "Failed to save", message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/app/library" className="text-sm text-white/70 hover:underline">
          ← Back to Library
        </Link>
        {data?.url ? (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          >
            Open original
          </a>
        ) : null}
      </div>
      <div className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/85">
          {data?.snapshotStatus === "READY" ? 
            <a
            // ignore this for now. href={data. }
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
          >
            Open snapshot
          </a>
          : 
          
          data?.snapshotStatus === "FAILED" ? 
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
            {data.snapshotError}
            <button
              onClick={handleSnapshotRequest}
              type="button"
              disabled={submitting || !token}
              className="mt-6 w-full rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Try Again"}
            </button>
          </div> 
          
          :  (<button
            onClick={handleSnapshotRequest}
            type="button"
            disabled={submitting || !token}
            className="mt-6 w-full rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>)}
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
        </div>
        
      )}
    </div>
  );
}

