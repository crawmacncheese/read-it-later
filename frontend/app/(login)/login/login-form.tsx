"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      const next = searchParams.get("redirect");
      router.replace(next && next.startsWith("/") ? next : "/app");
    }
  }, [isLoading, user, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      posthog.identify(email, { email });
      posthog.capture("user_logged_in", { login_method: "email" });
      toast({ title: "Logged in", message: "Welcome back!", variant: "success" });
      const next = searchParams.get("redirect");
      router.push(next && next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast({ title: "Login failed", message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoading && user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--color-light-100)]">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      {searchParams.get("registered") === "1" && (
        <p
          className="mb-6 rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-2 text-center text-sm text-[var(--foreground)]"
          role="status"
        >
          Account created. You can log in now.
        </p>
      )}
      <h1 className="text-center text-2xl font-semibold text-[var(--foreground)]">
        Log in
      </h1>
      <p className="mt-2 text-center text-sm text-[var(--color-light-200)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[var(--primary)] underline-offset-2 hover:underline"
        >
          Sign up
        </Link>
      </p>
      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-5 rounded-[var(--radius)] border border-[var(--color-border-dark)] bg-[var(--color-dark-100)]/80 p-6 backdrop-blur-sm"
      >
        {error && (
          <p
            className="rounded-md bg-[var(--destructive)]/20 px-3 py-2 text-sm text-[var(--foreground)]"
            role="alert"
          >
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm text-[var(--color-light-200)]"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--color-border-dark)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="block text-sm text-[var(--color-light-200)]"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--color-border-dark)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[var(--radius)] bg-[var(--primary)] py-2.5 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
