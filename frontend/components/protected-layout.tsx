"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (user) return;
    const redirect = pathname || "/app";
    router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--color-light-100)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--color-light-100)]">
        Redirecting to login…
      </div>
    );
  }

  return <>{children}</>;
}
