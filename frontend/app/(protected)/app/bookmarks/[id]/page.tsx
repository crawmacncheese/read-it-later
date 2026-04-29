"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { getBookmark } from "@/lib/api";
import type { BookmarkDetail } from "@/lib/types";

export default function BookmarkDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<BookmarkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBookmark(token, id)
      .then((d) => {
        if (cancelled) return;
        setData(d);
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Failed to load";
        setError(message);
        toast({ title: "Failed to load", message, variant: "error" });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id, toast]);

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

          <div className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/85">
            {data.content ?? "No extracted content yet (MVP)."}
          </div>
        </div>
      )}
    </div>
  );
}

