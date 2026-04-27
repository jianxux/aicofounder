import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import BrandMark from "@/components/BrandMark";

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function sanitizeNextPath(value?: string) {
  if (!value) {
    return "/dashboard";
  }

  const candidate = value.trim();

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }

  return candidate;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextValue = Array.isArray(resolvedSearchParams.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams.next;
  const redirectTo = sanitizeNextPath(nextValue);

  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <BrandMark className="h-11 w-11 shrink-0" />
          <div>
            <div className="text-base font-semibold tracking-[-0.02em] text-stone-900">AI Cofounder</div>
            <div className="text-sm font-medium text-stone-500">Founder workspace</div>
          </div>
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-16 pt-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start lg:px-8">
        <div className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Returning founders</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em] text-stone-950">Sign in to your AI Cofounder workspace</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
            Pick up where you left off, revisit research, and keep building with the same project context.
          </p>
          <div className="mt-8">
            <AuthButton
              redirectTo={redirectTo}
              label="Continue with Google"
              className="inline-flex items-center rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
            />
          </div>
          <p className="mt-4 text-sm text-stone-600">
            Not ready to sign in yet?{" "}
            <Link href="/dashboard" className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-900">
              Return to the demo dashboard
            </Link>
            {" "}and come back anytime.
          </p>
        </div>

        <aside className="rounded-[28px] border border-stone-200 bg-white/80 p-8 shadow-sm sm:p-10">
          <h2 className="text-lg font-semibold text-stone-900">What continues after sign-in</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Your workspace reopens with project memory, reusable assets, and the next move already queued.
          </p>
          <div className="mt-5 space-y-3" aria-label="Sign-in continuity details">
            <article className="rounded-2xl border border-stone-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-stone-900">Saved project context</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Goals, assumptions, and phase progress stay in place so you can pick up mid-stream.
              </p>
            </article>
            <article className="rounded-2xl border border-stone-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-stone-900">Reusable research and messaging</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Interview notes, competitor scans, and positioning drafts remain ready to refine.
              </p>
            </article>
            <article className="rounded-2xl border border-stone-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-stone-900">Next action readiness</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Pending decisions and suggested prompts are waiting so you can continue without setup.
              </p>
            </article>
          </div>
        </aside>
      </section>
    </main>
  );
}
