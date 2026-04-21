import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--color-light-100)]">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
