"use client";

import Link from "next/link";
import { type ReactNode, useEffect } from "react";
import AuthButton from "@/components/AuthButton";
import BrandMark from "@/components/BrandMark";
import Navbar from "@/components/Navbar";
import { trackEvent } from "@/lib/analytics";

const proofMetrics = [
  { value: "12k+", label: "founder and customer signals reviewed" },
  { value: "500+", label: "launch workflows shaped inside the workspace" },
  { value: "18 hrs", label: "saved from each validation cycle on average" },
];

const suggestedPrompts = ["Pressure-test the ICP", "Tighten the homepage story", "Find the weak evidence", "Map the launch sequence"];

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

const faqItems = [
  {
    question: "What do I get from the first session?",
    answer:
      "A first pass at the story: a sharper positioning angle, concrete claims worth testing, and a short list of next questions or homepage moves to act on immediately.",
  },
  {
    question: "Do I need a polished brief before I start?",
    answer:
      "No. You can begin with rough notes, call transcripts, a messy draft, or one stubborn question. The first session is designed to turn partial thinking into a usable brief.",
  },
  {
    question: "What happens after I sign in?",
    answer:
      "You land in the workspace, answer a few onboarding prompts about your product and stage, then paste notes or upload material so the first session can produce founder-ready outputs quickly.",
  },
  {
    question: "Are my uploaded notes private?",
    answer:
      "Your notes stay inside your workspace and are used to generate your tailored results. Treat the product like a private working area for founder material, not a public feed or shared gallery.",
  },
];

function LandingLinkCta({
  button,
  children,
  variant = "primary",
  href = "/dashboard",
}: {
  button: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
}) {
  const baseClassName =
    "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold tracking-[0.01em] transition duration-200";
  const variantClassName =
    variant === "primary"
      ? "bg-stone-950 text-white shadow-[0_20px_55px_rgba(16,12,10,0.2)] hover:-translate-y-0.5 hover:bg-stone-900"
      : "border border-stone-300/80 bg-white/70 text-stone-800 backdrop-blur-sm hover:border-stone-400 hover:bg-white/90";

  return (
    <Link
      href={href}
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
        <div className="absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_14%_10%,rgba(220,178,112,0.18),transparent_24%),radial-gradient(circle_at_86%_6%,rgba(255,255,255,0.84),transparent_18%),linear-gradient(180deg,#f8f4ed_0%,#f4ede4_52%,#f6f0e7_100%)]" />
        <div className="absolute left-[-7rem] top-[15rem] -z-10 h-[20rem] w-[20rem] rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-[-5rem] top-[11rem] -z-10 h-[18rem] w-[18rem] rounded-full bg-stone-900/6 blur-3xl" />

        <Navbar />

        <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-20 pt-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:px-8 lg:pb-24">
          <div className="max-w-2xl pt-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-stone-300/70 bg-white/78 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_14px_40px_rgba(74,52,21,0.08)] backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              AI strategy for founders who want conviction before momentum
            </div>

            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Founder-focused clarity</p>

            <h1 className="mt-4 max-w-3xl text-[clamp(2.85rem,5.5vw,4.6rem)] font-semibold leading-[1.01] tracking-[-0.05em] text-stone-950">
              Find the clearest angle for
              <span className="block [font-family:var(--font-serif)] text-[clamp(2.95rem,5.8vw,4.85rem)] font-medium italic text-stone-700">
                what you&apos;re building.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[1.05rem] leading-8 text-stone-600 sm:text-[1.1rem]">
              Start with the uncomfortable question, the messy customer signal, or the half-formed pitch. AI Cofounder turns that input into a sharper
              positioning story, clearer evidence, and a more usable next move.
            </p>

            <p className="mt-5 max-w-lg text-sm leading-7 text-stone-500">
              Designed for the moment when the product might be real, but the story still feels too soft to ship. Continue with Google to open your
              workspace and onboarding flow.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <AuthButton
                redirectTo="/dashboard"
                label="Continue with Google"
                analyticsButton="hero_get_started_free"
                analyticsPage="/"
                className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3.5 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_20px_55px_rgba(16,12,10,0.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-stone-900"
              />
              <LandingLinkCta button="hero_see_workspace" variant="secondary">
                See the founder workflow
              </LandingLinkCta>
            </div>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {proofMetrics.map((metric) => (
                <div key={metric.label} className="border-l border-stone-300/90 pl-4">
                  <div className="text-[1.9rem] font-semibold tracking-[-0.05em] text-stone-950">{metric.value}</div>
                  <div className="mt-2 max-w-[14rem] text-sm leading-6 text-stone-500">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-10 top-8 h-28 w-28 rounded-full bg-amber-200/35 blur-3xl" />
            <div className="absolute bottom-10 right-10 h-32 w-32 rounded-full bg-stone-950/8 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,252,248,0.96)_0%,rgba(248,239,228,0.94)_100%)] p-4 shadow-[0_34px_100px_rgba(37,25,11,0.16)] sm:p-5">
              <div className="rounded-[1.9rem] border border-stone-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(48,33,14,0.08)] backdrop-blur-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <BrandMark className="h-10 w-10 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Founder workspace preview</div>
                      <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-stone-950">Start with the question you cannot shake</div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Ready for input
                  </div>
                </div>

                <div className="mt-6 rounded-[1.7rem] border border-stone-200/80 bg-[#fcfaf7] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-5">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    <span>Type a question or paste notes</span>
                    <span>Seed stage SaaS</span>
                  </div>

                  <div className="mt-4 rounded-[1.4rem] border border-stone-200 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(52,39,21,0.06)]">
                    <p className="text-base leading-7 text-stone-800">
                      We have strong interview notes from operations teams, but our homepage still sounds generic. Help me find the strongest positioning
                      angle before we ship.<span className="ml-1 inline-block h-5 w-px translate-y-1 bg-stone-400 align-baseline" />
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1">9 interview notes attached</span>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1">Homepage draft imported</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[1.5rem] border border-stone-950 bg-stone-950 px-4 py-4 text-stone-50 shadow-[0_20px_55px_rgba(20,16,12,0.18)]">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone-400">Prompt</div>
                        <p className="mt-2 max-w-[26rem] text-sm leading-6 text-stone-200">
                          What does the customer already believe, and what proof would make this positioning feel specific instead of interchangeable?
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-stone-950"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="max-w-[88%] rounded-[1.35rem] rounded-bl-md bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
                      I can compare your customer language, homepage promise, and competitors to find the strongest claim to test first.
                    </div>
                    <div className="ml-auto max-w-[90%] rounded-[1.35rem] rounded-br-md border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm leading-6 text-stone-700">
                      Start by pressure-testing the buyer language. If that is weak, every homepage version will still feel ornamental.
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[1.6rem] border border-stone-200/80 bg-[#faf6f0] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Session outputs</div>
                    <div className="mt-4 space-y-3">
                      {["Positioning tension map", "Homepage claim to test", "Next 5 founder questions"].map((item) => (
                        <div key={item} className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-stone-200 bg-white px-3 py-3 text-sm text-stone-700">
                          <span>{item}</span>
                          <span className="text-stone-400">Ready</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-stone-200/80 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Why founders stay here</div>
                    <div className="mt-4 space-y-3">
                      {founderSignals.map((signal) => (
                        <div key={signal.title} className="rounded-[1.2rem] border border-stone-200/80 bg-[#fcfaf7] px-4 py-4">
                          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-stone-500">{signal.label}</div>
                          <div className="mt-2 text-base font-semibold tracking-[-0.03em] text-stone-950">{signal.title}</div>
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

      <section className="px-6 py-10 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-4xl rounded-[2.25rem] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(248,239,228,0.94)_100%)] p-7 shadow-[0_24px_90px_rgba(66,46,17,0.08)] sm:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Objections, handled clearly</div>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-tight tracking-[-0.05em] text-stone-950">
              Founder questions, answered before you sign in
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
              A narrow workflow should be easy to evaluate. These are the practical questions most founders ask before opening the workspace.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-[1.5rem] border border-stone-200/80 bg-white/88 p-5 shadow-[0_16px_40px_rgba(48,33,14,0.06)]">
                <h3 className="text-base font-semibold tracking-[-0.02em] text-stone-950">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{item.answer}</p>
              </article>
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
            <AuthButton
              redirectTo="/dashboard"
              label="Continue with Google"
              analyticsButton="footer_get_started"
              analyticsPage="/"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-stone-950 shadow-[0_18px_45px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-stone-100"
            />
          </div>
        </div>
      </footer>
    </main>
  );
}
