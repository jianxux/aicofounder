import Link from "next/link";

const recoveryActions = [
  "Restart your founder brief with the core problem and target user.",
  "Open your dashboard to continue from an existing project.",
  "Continue validation research with your latest customer notes.",
];

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#faf7f2] px-6 py-16 text-stone-900 sm:py-20">
      <section
        aria-labelledby="not-found-title"
        className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">AI Cofounder</p>
        <h1 id="not-found-title" className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
          Your work is still safe. This page may have moved, or the link may be incomplete.
        </p>

        <nav aria-label="Founder recovery links" className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Return home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Open dashboard
          </Link>
        </nav>

        <section aria-labelledby="recovery-actions-title" className="mt-8">
          <h2 id="recovery-actions-title" className="text-sm font-semibold text-stone-900">
            What you can do next
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
            {recoveryActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
