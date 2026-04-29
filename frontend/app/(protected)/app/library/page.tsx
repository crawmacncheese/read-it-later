import { LibraryClient } from "./library-client";

export default function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">My Library</h1>

      <p className="mt-3 text-sm text-white/70">
        Your saved links will show up here.
      </p>

      <LibraryClient />
    </div>
  );
}

