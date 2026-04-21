import Link from "next/link";

export default function AppHomePage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        App
      </h1>
      <p className="mt-3 text-[var(--color-light-200)]">
        You are signed in. Open your profile or continue building here.
      </p>
      <Link
        href="/app/profile"
        className="mt-8 inline-block rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
      >
        Profile
      </Link>
    </section>
  );
}
