"use client";

import Link from "next/link";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: AppErrorProps) {
  const hasDigest = Boolean(error.digest?.trim());

  return (
    <main className="min-h-screen bg-[#faf7f2] px-6 py-10 lg:px-8">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Founder Recovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-stone-950 sm:text-4xl">
          Let&apos;s get your founder workspace back on track
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
          Something interrupted this step. Your project context is still recoverable, and you can safely resume from
          your workspace.
        </p>

        <div className="mt-8 space-y-3 rounded-2xl bg-stone-50 p-5">
          <p className="text-sm font-semibold text-stone-900">Recovery cues</p>
          <ul className="space-y-2 text-sm text-stone-700">
            <li>Preserve context and retry safely to continue without losing your current direction.</li>
            <li>Return to your dashboard workspace if you want to switch projects or restart from a known state.</li>
            <li>Resume with evidence by confirming the next action before moving back into execution.</li>
          </ul>
        </div>

        {hasDigest && (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Error details</p>
            <p className="mt-2 text-sm text-stone-800">
              A safe diagnostic reference is available for support and incident triage.
            </p>
            <p className="mt-1 text-xs text-stone-600">Reference: {error.digest}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Retry safely
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
          >
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
