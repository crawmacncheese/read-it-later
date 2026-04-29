"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { createBookmark } from "@/lib/api";

export default function SavePage() {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const prio = priority.trim() ? Number(priority) : undefined;

      const created = await createBookmark(token, {
        url,
        tags: tagList.length ? tagList : undefined,
        priority: Number.isFinite(prio as number) ? prio : undefined,
      });

      toast({ title: "Saved", variant: "success" });
      router.push(`/app/bookmarks/${created.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast({ title: "Save failed", message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Save a link</h1>
      <p className="mt-3 text-sm text-white/70">
        Paste a URL and we’ll add it to your library. Saving the same URL again
        won’t create duplicates.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <label className="block text-sm text-white/80">URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          required
        />

        <label className="mt-5 block text-sm text-white/80">
          Tags (comma-separated)
        </label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="reading, ai, recipes"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
        />

        <label className="mt-5 block text-sm text-white/80">
          Priority (optional)
        </label>
        <input
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          placeholder="1"
          inputMode="numeric"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
        />

        {error ? (
          <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !token}
          className="mt-6 w-full rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

