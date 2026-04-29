"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/components/auth-provider";
import { deleteBookmark, listBookmarks } from "@/lib/api";
import type { BookmarkListItem } from "@/lib/types";

export function LibraryClient() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<BookmarkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    listBookmarks(token)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        toast({
          title: "Failed to load library",
          message: e instanceof Error ? e.message : "Request failed",
          variant: "error",
        });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) => {
      const hay = `${b.title ?? ""} ${b.url}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const handleDelete = async (id: number) => {
    if (!token) return;
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await deleteBookmark(token, id);
      toast({ title: "Deleted", variant: "info" });
    } catch (e) {
      setItems(prev);
      toast({
        title: "Delete failed",
        message: e instanceof Error ? e.message : "Request failed",
        variant: "error",
      });
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or URL..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          />
        </div>
        <Link
          href="/app/save"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          Save a link
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          No bookmarks yet.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/app/bookmarks/${b.id}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {b.title ?? b.url}
                  </Link>
                  <p className="mt-1 truncate text-xs text-white/60">{b.url}</p>
                  {b.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {b.tags.map((t) => (
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

                <button
                  onClick={() => handleDelete(b.id)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

