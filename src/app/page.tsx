"use client";

import Link from "next/link";
import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import AuthButton from "@/components/AuthButton";
import Navbar from "@/components/Navbar";
import { trackEvent } from "@/lib/analytics";

const proofMetrics = [
  { value: "Prompt-first", label: "start with the founder question before opening a blank project" },
  { value: "Structured", label: "capture the idea, user, URL, and uncertainty in one onboarding flow" },
  { value: "Project-based", label: "keep research, messaging, and next steps attached to the same workspace" },
];

const founderScenarios = [
  {
    label: "Validate a niche",
    prompt: "Figure out whether independent insurance brokers would pay for an AI assistant that summarizes carrier updates and recommends next actions.",
    outcomeHint: "Leave with an ICP read, buyer pains, and the sharpest wedge to test first.",
  },
  {
    label: "Fix weak positioning",
    prompt: "Pressure-test the positioning for a finance ops tool that helps multi-location dental practices stop losing money to insurance underpayments.",
    outcomeHint: "Get a clearer homepage angle, stronger value prop, and the claims that need evidence.",
  },
  {
    label: "Plan a launch story",
    prompt: "Help me craft the go-to-market story for an AI copilot that turns customer support tickets into product feedback and weekly roadmap briefs.",
    outcomeHint: "Walk away with a launch narrative, proof points to gather, and early messaging to test.",
  },
] as const;

const trustNotes = [
  {
    title: "Prompt handoff into onboarding",
    body: "Start on the landing page, then continue in the dashboard with the draft already waiting in the idea field.",
  },
  {
    title: "Research and messaging stay connected",
    body: "The workflow is built to move from market questions to product framing without splitting the story across tools.",
  },
  {
    title: "Trust comes from visible structure",
    body: "The product frames its value around captured inputs, saved projects, and explicit next steps rather than big promises.",
  },
];

const workflowMoments = [
  {
    number: "01",
    title: "Interrogate the market",
    body: "Start with the messy question, collect real signal, and find the tension worth building around.",
  },
  {
    number: "02",
    title: "Shape the point of view",
    body: "Turn research, customer language, and competitive context into a sharper product story.",
  },
  {
    number: "03",
    title: "Leave with a plan",
    body: "Walk away with a clearer homepage angle, validation path, and next founder moves.",
  },
];

const featureColumns = [
  {
    eyebrow: "Market research",
    title: "Turn early market research into a readable brief.",
    body: "Generate founder-ready research reports with sources, key insights, and the signal that matters most before you commit to a direction.",
    bullets: ["Competitor scans and whitespace", "Customer pain-point synthesis", "Proof before product decisions"],
  },
  {
    eyebrow: "Product thinking",
    title: "Bring the product idea into focus while it is still cheap to change.",
    body: "Use AI Cofounder to pressure-test messaging, refine the promise, and decide what deserves to exist before features multiply.",
    bullets: ["Homepage and positioning guidance", "Critical thinking instead of cheerleading", "Launch narrative tied to evidence"],
  },
];

const trustStrip = [
  "Prompt-first onboarding",
  "Built for market validation",
  "Designed for product clarity",
  "Privacy mode available",
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
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200";
  const variantClassName =
    variant === "primary"
      ? "bg-stone-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 hover:bg-stone-800"
      : "border border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50";

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

function LoginPromptModal({
  open,
  promptDraft,
  onClose,
}: {
  open: boolean;
  promptDraft: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-[#faf7f2] p-6 shadow-[0_32px_110px_rgba(28,25,23,0.18)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Continue with your prompt</div>
            <h2 id={titleId} className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-stone-950">Sign in to open this inside your workspace.</h2>
            <p id={descriptionId} className="mt-4 text-sm leading-7 text-stone-600">
              We&apos;ll carry this prompt into AI Cofounder so the customer can keep going from the dashboard instead of losing the thought.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
          >
            Close
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-500">Prompt preview</div>
          <p className="mt-3 text-sm leading-7 text-stone-700">{promptDraft || "Start with an idea, problem, or question."}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <AuthButton
            redirectTo="/dashboard"
            label="Continue with Google"
            analyticsButton="hero_prompt_login"
            analyticsPage="/"
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-stone-800"
          />
          <LandingLinkCta button="hero_prompt_explore_demo" variant="secondary">
            Explore demo first
          </LandingLinkCta>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [heroPrompt, setHeroPrompt] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const heroPromptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void trackEvent("page_view", {
      page: "/",
      source: "landing",
    });
  }, []);

  const handleHeroSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const nextPrompt = heroPrompt.trim();
    if (!nextPrompt) {
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("landingPromptDraft", nextPrompt);
    }

    void trackEvent("cta_click", {
      page: "/",
      button: "hero_prompt_submit",
    });

    setShowLoginPrompt(true);
  };

  const handleHeroKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleHeroSubmit();
    }
  };

  const isScenarioSelected = (scenarioPrompt: string) => heroPrompt === scenarioPrompt;

  const handleScenarioSelect = (scenarioPrompt: string) => {
    setHeroPrompt(scenarioPrompt);
    heroPromptRef.current?.focus();
  };

  return (
    <>
      <LoginPromptModal open={showLoginPrompt} promptDraft={heroPrompt.trim()} onClose={() => setShowLoginPrompt(false)} />
      <main className="min-h-screen overflow-x-hidden bg-[#f8f3ea] text-stone-950">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_24%),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.9),transparent_28%),linear-gradient(180deg,#fbf7f0_0%,#f8f3ea_58%,#f8f3ea_100%)]" />
        <div className="absolute left-[-8rem] top-[8rem] -z-10 h-[20rem] w-[20rem] rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-[-6rem] top-[10rem] -z-10 h-[22rem] w-[22rem] rounded-full bg-orange-200/20 blur-3xl" />

        <Navbar />

        <section className="mx-auto w-full max-w-6xl px-6 pb-18 pt-8 text-center lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Built for the moment you need conviction before momentum
            </div>

            <h1 className="mt-8 text-[clamp(3.2rem,7vw,6.3rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-stone-950">
              Make something people
              <span className="block text-stone-700">actually want.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-stone-600 sm:text-[1.15rem]">
              Research, pressure-test, and shape your product with AI before you waste cycles on a story the market does not believe.
            </p>

            <div className="mt-5 text-sm text-stone-500">Research and build your product with AI.</div>
          </div>

          <div className="mx-auto mt-10 max-w-4xl">
            <div className="overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/80 p-4 shadow-[0_34px_120px_rgba(28,25,23,0.12)] backdrop-blur-sm sm:p-5">
              <div className="rounded-[1.9rem] border border-stone-200 bg-[#fcfaf6] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">AI cofounder</div>
                  <div className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">Privacy mode</div>
                </div>

                <div className="mt-4 text-[clamp(1.35rem,2.6vw,2rem)] font-semibold tracking-[-0.04em] text-stone-950">
                  Start with the founder question you cannot shake.
                </div>

                <form onSubmit={handleHeroSubmit} className="mx-auto mt-6 max-w-3xl rounded-[1.9rem] border border-stone-200 bg-white p-4 shadow-[0_18px_45px_rgba(28,25,23,0.06)] sm:p-5">
                  <label htmlFor="hero-prompt" className="block text-left text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    I want to
                  </label>
                  <div className="mt-3 rounded-[1.5rem] border border-stone-200 bg-[#f8f5ef] px-4 py-4 sm:px-5 sm:py-5">
                    <textarea
                      ref={heroPromptRef}
                      id="hero-prompt"
                      value={heroPrompt}
                      onChange={(event) => setHeroPrompt(event.target.value)}
                      onKeyDown={handleHeroKeyDown}
                      rows={4}
                      placeholder="Pressure-test an AI product idea before I build the wrong thing."
                      aria-describedby="hero-prompt-instructions hero-prompt-starting-points-description"
                      className="min-h-[132px] w-full resize-none bg-transparent text-base leading-8 text-stone-800 outline-none placeholder:text-stone-400"
                    />
                    <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <span id="hero-prompt-instructions" className="text-sm text-stone-500">
                        Press Enter to continue, or click Send to open the login prompt.
                      </span>
                      <button
                        type="submit"
                        disabled={!heroPrompt.trim()}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                  <fieldset className="mt-5 text-left">
                    <legend className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-stone-500">Need a stronger starting point?</legend>
                    <p id="hero-prompt-starting-points-description" className="mt-2 text-sm leading-6 text-stone-500">
                      Pick a founder scenario to prefill the prompt, then tailor it to your market.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {founderScenarios.map((scenario) => {
                        const selected = isScenarioSelected(scenario.prompt);

                        return (
                        <button
                          key={scenario.label}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => handleScenarioSelect(scenario.prompt)}
                          className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                            selected
                              ? "border-stone-950 bg-stone-950 text-white shadow-[0_18px_45px_rgba(28,25,23,0.14)]"
                              : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold tracking-[-0.02em] ${
                              selected ? "text-white" : "text-stone-950"
                            }`}
                          >
                            {scenario.label}
                          </div>
                          <p
                            className={`mt-2 text-sm leading-6 ${
                              selected ? "text-stone-200" : "text-stone-500"
                            }`}
                          >
                            {scenario.outcomeHint}
                          </p>
                        </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </form>

                <div className="mt-6 grid gap-4 text-left lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[1.6rem] border border-stone-200 bg-stone-950 p-5 text-stone-50">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-400">Example insight</div>
                    <p className="mt-3 text-lg leading-8 text-stone-100">The strongest angle usually comes from sharper customer language, not a longer feature list.</p>
                    <div className="mt-6 grid gap-3 text-sm text-stone-300">
                      <div className="rounded-2xl bg-white/5 px-4 py-3">Founders who win here explain the problem more clearly, not just the product.</div>
                      <div className="rounded-2xl bg-white/5 px-4 py-3">Your next move is tightening the positioning claim before shipping the homepage.</div>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-stone-200 bg-white p-5">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-500">Session outputs</div>
                    <div className="mt-4 space-y-3">
                      {["Positioning report", "Market research memo", "Homepage angle to test"].map((item) => (
                        <div key={item} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-[#faf7f2] px-4 py-3 text-sm text-stone-700">
                          <span>{item}</span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Ready</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 text-left sm:grid-cols-3">
            {proofMetrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-stone-200 bg-white/80 p-4 shadow-[0_16px_50px_rgba(28,25,23,0.05)] backdrop-blur-sm">
                <div className="text-2xl font-semibold tracking-[-0.05em] text-stone-950">{metric.value}</div>
                <div className="mt-2 text-sm leading-6 text-stone-500">{metric.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <AuthButton
              redirectTo="/dashboard"
              label="Continue with Google"
              analyticsButton="hero_get_started_free"
              analyticsPage="/"
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_55px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800"
            />
            <LandingLinkCta button="hero_see_workspace" variant="secondary">
              See the founder workflow
            </LandingLinkCta>
          </div>
        </section>
      </div>

      <section id="trust" className="mx-auto w-full max-w-7xl scroll-mt-24 px-6 py-4 lg:px-8">
        <div className="grid gap-3 rounded-[2rem] border border-stone-200 bg-white/75 p-4 text-sm text-stone-500 shadow-[0_20px_60px_rgba(28,25,23,0.05)] sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
          {trustStrip.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#faf7f2] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto grid w-full max-w-7xl scroll-mt-24 gap-8 px-6 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-[0_24px_80px_rgba(28,25,23,0.06)]">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Designed for making products</div>
          <h2 className="mt-5 text-[clamp(2.3rem,4.6vw,4rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-stone-950">
            From vague instinct to a product story with teeth.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">
            AI Cofounder is built for the moment when the idea feels promising but the promise still reads soft, generic, or interchangeable.
          </p>

          <div className="mt-8 grid gap-4">
            {workflowMoments.map((moment) => (
              <div key={moment.number} className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-[#faf7f2] p-5 sm:grid-cols-[auto_1fr]">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">{moment.number}</div>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">{moment.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{moment.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="capabilities" className="grid scroll-mt-24 gap-4">
          {featureColumns.map((feature, index) => (
            <div
              key={feature.title}
              className={`rounded-[2rem] border p-7 shadow-[0_24px_80px_rgba(28,25,23,0.06)] ${
                index === 0 ? "border-stone-200 bg-[linear-gradient(180deg,#fffdf8_0%,#f7efe3_100%)]" : "border-stone-900 bg-stone-950 text-stone-50"
              }`}
            >
              <div className={`text-sm font-semibold uppercase tracking-[0.22em] ${index === 0 ? "text-stone-500" : "text-stone-400"}`}>{feature.eyebrow}</div>
              <h3 className={`mt-4 text-[clamp(1.8rem,3vw,2.7rem)] font-semibold leading-tight tracking-[-0.05em] ${index === 0 ? "text-stone-950" : "text-white"}`}>
                {feature.title}
              </h3>
              <p className={`mt-4 text-base leading-8 ${index === 0 ? "text-stone-600" : "text-stone-300"}`}>{feature.body}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {feature.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className={`rounded-[1.35rem] border px-4 py-4 text-sm leading-6 ${
                      index === 0 ? "border-stone-200 bg-white text-stone-700" : "border-white/10 bg-white/5 text-stone-200"
                    }`}
                  >
                    {bullet}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
        <div className="rounded-[2.25rem] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(248,243,234,0.96)_100%)] p-8 shadow-[0_26px_90px_rgba(28,25,23,0.06)] lg:p-10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Trust framing</div>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-tight tracking-[-0.05em] text-stone-950">
                The emotional job is clarity, not volume.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-stone-600">
              This page keeps the trust framing grounded in visible workflow details instead of unverifiable social proof.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {trustNotes.map((note, index) => (
              <figure
                key={note.title}
                className={`rounded-[1.8rem] border p-6 ${index === 1 ? "border-stone-900 bg-stone-950 text-stone-50" : "border-stone-200 bg-white text-stone-900"}`}
              >
                <div className={`text-sm font-semibold uppercase tracking-[0.18em] ${index === 1 ? "text-amber-300" : "text-amber-500"}`}>
                  Product signal
                </div>
                <blockquote className="mt-4 text-[1.04rem] leading-8 tracking-[-0.02em]">
                  {note.body}
                </blockquote>
                <figcaption className={`mt-6 text-sm ${index === 1 ? "text-stone-300" : "text-stone-500"}`}>
                  <span className="font-semibold">{note.title}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 pb-12 pt-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 overflow-hidden rounded-[2.5rem] border border-stone-800 bg-[linear-gradient(135deg,#2a1f18_0%,#17120f_54%,#0f0c0a_100%)] p-8 shadow-[0_32px_110px_rgba(45,31,12,0.16)] lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div className="max-w-3xl text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/80">Start with a better question</div>
            <h2 className="mt-4 text-[clamp(2.5rem,5vw,4.7rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
              Founder-grade direction,
              <span className="block text-amber-100">without the founder fog.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-200">
              Use AI Cofounder when you need market research, product thinking, and launch narrative to read like they belong to the same company.
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
    </>
  );
}
