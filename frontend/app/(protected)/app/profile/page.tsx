"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Profile
      </h1>
      <dl className="mt-8 space-y-4 text-left text-sm">
        <div>
          <dt className="text-[var(--color-light-200)]">Email</dt>
          <dd className="mt-1 text-[var(--foreground)]">{user?.email}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-light-200)]">Username</dt>
          <dd className="mt-1 text-[var(--foreground)]">{user?.username}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-light-200)]">Role</dt>
          <dd className="mt-1 text-[var(--foreground)]">{user?.roles}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-10 w-full rounded-[var(--radius)] border border-[var(--color-border-dark)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--color-dark-200)]"
      >
        Log out
      </button>
    </section>
  );
}
