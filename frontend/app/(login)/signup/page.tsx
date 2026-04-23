"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(username, email, password);
      toast({
        title: "Account created",
        message: "You can log in now.",
        variant: "success",
      });
      router.push("/login?registered=1");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      setError(message);
      toast({ title: "Sign up failed", message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-semibold text-[var(--foreground)]">
        Create account
      </h1>
      <p className="mt-2 text-center text-sm text-[var(--color-light-200)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--primary)] underline-offset-2 hover:underline"
        >
          Log in
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
            htmlFor="signup-username"
            className="block text-sm text-[var(--color-light-200)]"
          >
            Username
          </label>
          <input
            id="signup-username"
            type="text"
            autoComplete="username"
            required
            minLength={2}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--color-border-dark)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
        </div>
        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm text-[var(--color-light-200)]"
          >
            Email
          </label>
          <input
            id="signup-email"
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
            htmlFor="signup-password"
            className="block text-sm text-[var(--color-light-200)]"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--color-border-dark)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
          <p className="mt-1 text-xs text-[var(--color-light-200)]">
            At least 8 characters (matches backend rules).
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[var(--radius)] bg-[var(--primary)] py-2.5 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </div>
  );
}
