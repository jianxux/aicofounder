"use client";

import Link from "next/link";
import { type ReactNode, useEffect } from "react";
import BrandMark from "@/components/BrandMark";
import Navbar from "@/components/Navbar";
import { trackEvent } from "@/lib/analytics";

const proofMetrics = [
  { value: "12k+", label: "founder and customer signals reviewed" },
  { value: "500+", label: "launch workflows shaped inside the workspace" },
  { value: "18 hrs", label: "saved from each validation cycle on average" },
];

const founderSignals = [
  {
    label: "What founders come in with",
    title: "A strong instinct, but weak proof.",
    body: "The product looks promising until the homepage, pitch, and roadmap all say different things.",
  },
  {
    label: "What the workspace helps produce",
    title: "One sharper point of view.",
    body: "Research, messaging, and rollout planning stay connected so the idea reads clearly under pressure.",
  },
];

const workflowMoments = [
  {
    number: "01",
    title: "Interrogate the idea",
    body: "Clarify the user, the specific tension, and the promise worth testing before features start multiplying.",
  },
  {
    number: "02",
    title: "Pull signal into focus",
    body: "Sift recurring market language, competing claims, and founder assumptions into a tighter product angle.",
  },
  {
    number: "03",
    title: "Leave with launch-ready clarity",
    body: "Turn the strongest insight into a homepage direction, a product plan, and a more credible story to share.",
  },
];

const founderVoices = [
  {
    quote: "I do not need more features. I need the sentence that makes the product make sense.",
    role: "Pre-seed founder",
  },
  {
    quote: "The real cost was not building slowly. It was validating the wrong promise in public.",
    role: "Second-time operator",
  },
  {
    quote: "When the research and the narrative finally matched, every next decision got easier.",
    role: "Founder after repositioning",
  },
];

function LandingCta({
  button,
  children,
  variant = "primary",
}: {
  button: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const baseClassName =
    "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold tracking-[0.01em] transition duration-200";
  const variantClassName =
    variant === "primary"
      ? "bg-stone-950 text-white shadow-[0_20px_55px_rgba(16,12,10,0.2)] hover:-translate-y-0.5 hover:bg-stone-900"
      : "border border-stone-300/80 bg-white/70 text-stone-800 backdrop-blur-sm hover:border-stone-400 hover:bg-white/90";

  return (
    <Link
      href="/dashboard"
      onClick={() =>
        void trackEvent("cta_click", {
          page: "/",
          button,
        })
      }
      className={`${baseClassName} ${variantClassName}`}
    >
      {children}
    </Link>
  );
}

export default function LandingPage() {
  useEffect(() => {
    void trackEvent("page_view", {
      page: "/",
      source: "landing",
    });
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f0e7] text-stone-950">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(circle_at_12%_8%,rgba(205,156,90,0.26),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.88),transparent_22%),linear-gradient(180deg,#f8f4ed_0%,#f4ede3_55%,#f6f0e7_100%)]" />
        <div className="absolute left-[-8rem] top-[14rem] -z-10 h-[24rem] w-[24rem] rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-[10rem] -z-10 h-[22rem] w-[22rem] rounded-full bg-stone-900/8 blur-3xl" />

        <Navbar />

        <section className="mx-auto grid w-full max-w-7xl gap-14 px-6 pb-20 pt-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:px-8 lg:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-stone-300/70 bg-white/72 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_14px_40px_rgba(74,52,21,0.08)] backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              AI strategy for founders who want conviction before momentum
            </div>

            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Founder-focused clarity</p>

            <h1 className="mt-4 max-w-4xl text-[clamp(3.5rem,8vw,6.9rem)] font-semibold leading-[0.92] tracking-[-0.07em]">
              Build the company people can
              <span className="block [font-family:var(--font-serif)] text-[clamp(3.7rem,8.4vw,7.4rem)] font-semibold italic text-stone-700">
                feel in a sentence.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-[1.18rem]">
              AI Cofounder helps startup founders turn scattered research, vague positioning, and launch anxiety into a cleaner story,
              sharper market evidence, and a more deliberate first impression.
            </p>

            <div className="mt-8 inline-flex max-w-xl items-start gap-3 rounded-[1.75rem] border border-amber-200/70 bg-amber-50/70 px-5 py-4 text-stone-800 shadow-[0_18px_45px_rgba(128,86,29,0.08)]">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-600" />
              <p className="text-base leading-7">
                The tagline here is simple on purpose: <span className="font-semibold">less founder theater, more founder certainty.</span>
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <LandingCta button="hero_get_started_free">Start building free</LandingCta>
              <LandingCta button="hero_see_workspace" variant="secondary">
                See the founder workflow
              </LandingCta>
            </div>

            <div className="mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
              {proofMetrics.map((metric) => (
                <div key={metric.label} className="border-l border-stone-300/90 pl-4">
                  <div className="text-3xl font-semibold tracking-[-0.05em] text-stone-950">{metric.value}</div>
                  <div className="mt-2 max-w-[14rem] text-sm leading-6 text-stone-500">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-6 h-32 w-32 rounded-full bg-amber-200/35 blur-3xl" />
            <div className="absolute bottom-8 right-8 h-40 w-40 rounded-full bg-stone-950/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2.4rem] border border-white/70 bg-[linear-gradient(155deg,rgba(255,251,245,0.94)_0%,rgba(248,239,227,0.92)_42%,rgba(34,27,20,0.98)_43%,rgba(22,17,13,0.98)_100%)] p-5 shadow-[0_38px_120px_rgba(28,20,12,0.24)] sm:p-7">
              <div className="grid gap-5">
                <div className="rounded-[1.8rem] border border-stone-200/80 bg-white/85 p-5 shadow-[0_18px_40px_rgba(48,33,14,0.08)] backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <BrandMark className="h-11 w-11 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Hero prompt</div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-stone-950">Ask the hard founder question first</div>
                      </div>
                    </div>
                    <div className="rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white">Static preview</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="max-w-[85%] rounded-[1.5rem] rounded-bl-md bg-stone-950 px-5 py-4 text-sm leading-7 text-stone-100 shadow-[0_18px_45px_rgba(15,12,10,0.24)]">
                      What would make a founder abandon this idea after the first five customer calls?
                    </div>
                    <div className="ml-auto max-w-[88%] rounded-[1.5rem] rounded-br-md border border-stone-200/80 bg-[#f8f3eb] px-5 py-4 text-sm leading-7 text-stone-700">
                      Start with the evidence that could break the story: weak urgency, fuzzy buyer language, or a promise that sounds better than it converts.
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.6rem] border border-stone-200/80 bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <div className="flex items-center justify-between gap-4 rounded-[1.25rem] bg-stone-950 px-4 py-4 text-sm text-stone-100">
                      <span className="max-w-[18rem] leading-6 text-stone-200">
                        Describe the founder, the customer tension, and the promise you want to pressure-test.
                      </span>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-stone-950">↑</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                      {["Positioning critique", "Pain-point synthesis", "Homepage narrative", "Launch sequence"].map((item) => (
                        <span key={item} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.94fr_1.06fr]">
                  <div className="rounded-[1.8rem] border border-white/10 bg-stone-950/92 p-5 text-stone-100">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/70">Workspace outcome</div>
                    <div className="mt-4 text-2xl font-semibold tracking-[-0.04em]">A calmer next move.</div>
                    <p className="mt-4 text-sm leading-7 text-stone-300">
                      The interface should feel like a founder atelier, not a dashboard full of noisy widgets.
                    </p>
                  </div>

                  <div className="rounded-[1.8rem] border border-stone-200/80 bg-white/85 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Founder tension, resolved</div>
                    <div className="mt-4 space-y-3">
                      {founderSignals.map((signal) => (
                        <div key={signal.title} className="rounded-[1.35rem] border border-stone-200/80 bg-[#f8f2e9] px-4 py-4">
                          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-stone-500">{signal.label}</div>
                          <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-stone-950">{signal.title}</div>
                          <p className="mt-2 text-sm leading-6 text-stone-600">{signal.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="rounded-[2.25rem] border border-stone-200/80 bg-white/72 p-7 shadow-[0_24px_90px_rgba(66,46,17,0.08)] backdrop-blur-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Credibility, used with restraint</div>
          <h2 className="mt-5 text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-stone-950">
            A founder page should feel
            <span className="block [font-family:var(--font-serif)] font-semibold italic text-stone-700">edited, not over-explained.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">
            The product promise is deliberately narrow: help founders understand what deserves to exist, how to describe it, and what to do next.
          </p>

          <div className="mt-8 grid gap-4">
            {workflowMoments.map((moment) => (
              <div key={moment.number} className="grid gap-3 rounded-[1.6rem] border border-stone-200/80 bg-[#fbf7f1] p-5 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">{moment.number}</div>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">{moment.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{moment.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2.25rem] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(250,243,233,0.9)_100%)] p-7 shadow-[0_24px_90px_rgba(66,46,17,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Founder voices</div>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-tight tracking-[-0.05em] text-stone-950">
                The emotional job is clarity, not volume.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-stone-600">
              These are the kinds of tensions this workflow is built to resolve, presented like notes from the edge of company formation.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {founderVoices.map((voice, index) => (
              <figure
                key={voice.quote}
                className={`rounded-[1.8rem] border p-6 shadow-[0_18px_50px_rgba(55,37,12,0.06)] ${
                  index === 1 ? "border-stone-900/85 bg-stone-950 text-stone-100" : "border-stone-200/80 bg-white/86 text-stone-900"
                }`}
              >
                <blockquote className="text-[1.05rem] leading-8 tracking-[-0.02em]">
                  &ldquo;{voice.quote}&rdquo;
                </blockquote>
                <figcaption className={`mt-5 text-sm font-medium ${index === 1 ? "text-stone-300" : "text-stone-500"}`}>{voice.role}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 pb-12 pt-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 overflow-hidden rounded-[2.5rem] border border-stone-200/80 bg-[linear-gradient(135deg,#f7efe3_0%,#efe3d1_32%,#17120f_32.4%,#17120f_100%)] p-8 shadow-[0_32px_110px_rgba(45,31,12,0.16)] lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div className="max-w-3xl text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/70">Start with a better question</div>
            <h2 className="mt-4 text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
              Founder-grade direction
              <span className="block [font-family:var(--font-serif)] font-semibold italic text-amber-100">without the founder fog.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300">
              Use AI Cofounder when you need product thinking, evidence, and launch narrative to read like they belong to the same company.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              onClick={() =>
                void trackEvent("cta_click", {
                  page: "/",
                  button: "footer_get_started",
                })
              }
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-stone-950 shadow-[0_18px_45px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-stone-100"
            >
              Get started free
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
