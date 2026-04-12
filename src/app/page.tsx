"use client";

import Link from "next/link";
import { useEffect } from "react";
import BrandMark from "@/components/BrandMark";
import Navbar from "@/components/Navbar";
import { trackEvent } from "@/lib/analytics";

const trustMetrics = [
  { label: "Signals reviewed", value: "12k+" },
  { label: "Founder workflows launched", value: "500+" },
  { label: "Time saved per validation cycle", value: "18 hrs" },
];

const featureColumns = [
  {
    eyebrow: "Research depth",
    title: "Turn scattered founder noise into clear market conviction.",
    description:
      "Pull evidence from community conversations, identify repeated pain points, and separate signal from polite encouragement before you build.",
    bullets: ["Community-backed pain points", "Competitive framing and positioning angles", "Opinionated guidance when the idea is weak"],
  },
  {
    eyebrow: "Execution clarity",
    title: "Move from idea to launch plan without losing narrative quality.",
    description:
      "Shape messaging, map the product, and keep strategy, research, and launch artifacts in one focused workspace that stays usable under pressure.",
    bullets: ["Structured phases from concept to GTM", "Visual canvas for assets and priorities", "A single workspace for research and delivery"],
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Frame the opportunity",
    description: "Define the audience, sharpest pain, and promise worth testing before the product scope drifts.",
  },
  {
    number: "02",
    title: "Pressure-test with evidence",
    description: "Review synthesized signals from founder communities and customer language, not empty trend-chasing.",
  },
  {
    number: "03",
    title: "Ship with a coherent plan",
    description: "Leave with clearer positioning, an execution roadmap, and a startup narrative that can convert.",
  },
];

const proofCards = [
  {
    title: "Sharper positioning",
    body: "Get to a category-defining message faster by grounding the homepage promise in evidence instead of instinct.",
  },
  {
    title: "Less founder drift",
    body: "Keep research, planning, and build decisions connected so the product story stays consistent across launch.",
  },
  {
    title: "More credible launches",
    body: "Use structured output that looks investor-ready, team-ready, and customer-ready from the first draft.",
  },
];

const testimonials = [
  {
    name: "Maya Chen",
    title: "Founder, SignalLayer",
    quote:
      "It replaced vague momentum with real conviction. I could see the problem language, the angle, and the path to a better product story in one session.",
  },
  {
    name: "Jordan Alvarez",
    title: "Solo builder, Northstar Studio",
    quote:
      "The quality bar felt high. Instead of flattering the idea, it tightened the pitch and showed me where the market signal was actually strong enough to pursue.",
  },
  {
    name: "Priya Patel",
    title: "Operator turned founder",
    quote:
      "The interface feels premium, but the practical value is the clarity. I left with a clearer homepage, research direction, and launch plan the same day.",
  },
];

function LandingCta({ button, children, variant = "primary" }: { button: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  const baseClassName =
    "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold tracking-[-0.01em] transition duration-200";
  const variantClassName =
    variant === "primary"
      ? "bg-stone-950 text-white shadow-[0_18px_45px_rgba(20,18,16,0.24)] hover:-translate-y-0.5 hover:bg-stone-900"
      : "border border-white/15 bg-white/8 text-stone-100 backdrop-blur-sm hover:border-white/25 hover:bg-white/12";

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
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(241,200,136,0.22),transparent_24%),linear-gradient(180deg,#fffdf9_0%,#f6f1ea_45%,#f7f4ef_100%)] text-stone-950">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_20%_10%,rgba(244,196,123,0.22),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.62),transparent_20%),radial-gradient(circle_at_50%_0%,rgba(17,24,39,0.06),transparent_36%)]" />
        <Navbar />

        <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-24 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:pb-28">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-amber-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_35px_rgba(120,92,44,0.08)] backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Premium AI product strategy for founders who need signal, not hype
            </div>

            <h1 className="mt-8 max-w-4xl text-[clamp(3.4rem,8vw,6.4rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-stone-950">
              Build the startup story
              <span className="block text-stone-500">before you build the wrong product.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
              AI Cofounder helps founders validate demand, sharpen positioning, and move from messy concept to credible launch plan with a cleaner, more focused workflow.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <LandingCta button="hero_get_started_free">Start building free</LandingCta>
              <LandingCta button="hero_see_workspace" variant="secondary">
                Explore the workspace
              </LandingCta>
            </div>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {trustMetrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-stone-200/80 bg-white/72 px-5 py-5 shadow-[0_18px_40px_rgba(46,34,18,0.08)] backdrop-blur-sm">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-stone-950">{metric.value}</div>
                  <div className="mt-1 text-sm leading-6 text-stone-500">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-amber-300/35 blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-44 w-44 rounded-full bg-stone-900/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(160deg,rgba(21,19,17,0.98)_0%,rgba(39,33,28,0.95)_52%,rgba(78,59,37,0.92)_100%)] p-6 text-stone-50 shadow-[0_35px_120px_rgba(24,18,12,0.32)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <BrandMark className="h-12 w-12 shrink-0" />
                  <div>
                    <div className="text-sm font-medium uppercase tracking-[0.24em] text-amber-200/80">Live project</div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Launch clarity dashboard</div>
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-stone-300">Beta</div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Primary insight</div>
                  <div className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">
                    Teams do not need more AI ideas. They need evidence-backed product direction.
                  </div>
                  <p className="mt-4 text-sm leading-7 text-stone-300">
                    Distill research into a positioning angle, homepage promise, and rollout plan without opening five different tools.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Workflow</div>
                    <div className="mt-3 space-y-3 text-sm text-stone-200">
                      <div className="flex items-center justify-between rounded-2xl bg-black/15 px-4 py-3">
                        <span>Research synthesis</span>
                        <span className="text-emerald-300">Ready</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-black/15 px-4 py-3">
                        <span>Homepage narrative</span>
                        <span className="text-amber-300">In review</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-black/15 px-4 py-3">
                        <span>Launch plan</span>
                        <span className="text-sky-300">Queued</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-amber-200/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Outcome</div>
                    <p className="mt-3 text-sm leading-7 text-stone-200">
                      Founders leave with clearer messaging, stronger market proof, and an execution path that looks premium enough to share.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["Evidence-backed positioning", "Opinionated product critique", "Launch-ready outputs"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-7xl px-6 pb-6 lg:px-8">
        <div className="grid gap-5 rounded-[2rem] border border-stone-200/70 bg-white/70 p-6 shadow-[0_20px_80px_rgba(64,43,15,0.08)] backdrop-blur-sm lg:grid-cols-3 lg:p-8">
          {proofCards.map((card) => (
            <div key={card.title} className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50/70 p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-400">Why it converts</div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-stone-950">{card.title}</h2>
              <p className="mt-3 text-base leading-7 text-stone-600">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-20 lg:grid-cols-2 lg:px-8">
        {featureColumns.map((feature) => (
          <div
            key={feature.title}
            className="rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,242,233,0.9))] p-8 shadow-[0_22px_90px_rgba(41,27,10,0.08)]"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-400">{feature.eyebrow}</div>
            <h2 className="mt-5 max-w-xl text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.05em] text-stone-950">
              {feature.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">{feature.description}</p>
            <div className="mt-8 space-y-3">
              {feature.bullets.map((bullet) => (
                <div
                  key={bullet}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-4 text-sm font-medium text-stone-700"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  {bullet}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
        <div className="grid gap-6 rounded-[2rem] border border-stone-200/70 bg-stone-950 px-6 py-8 text-white shadow-[0_35px_120px_rgba(17,12,7,0.22)] lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/70">How it works</div>
            <h2 className="mt-5 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1] tracking-[-0.05em]">
              A tighter path from concept to market proof.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-stone-300">
              The product is designed to reduce founder noise, improve message quality, and keep momentum focused on validation and launch.
            </p>
          </div>

          <div className="grid gap-4">
            {workflowSteps.map((step) => (
              <div key={step.number} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-6 backdrop-blur-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200/70">{step.number}</div>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-stone-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-400">Founder proof</div>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-tight tracking-[-0.05em] text-stone-950">
              Trusted when the homepage, pitch, and product direction all need work at once.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-8 text-stone-600">
            The value is not just speed. It is better decisions, cleaner outputs, and a product story that holds together under scrutiny.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-7 shadow-[0_20px_90px_rgba(53,36,12,0.08)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-950 text-sm font-semibold text-white">
                  {testimonial.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
                <figcaption>
                  <div className="text-base font-semibold text-stone-950">{testimonial.name}</div>
                  <div className="text-sm text-stone-500">{testimonial.title}</div>
                </figcaption>
              </div>
              <blockquote className="mt-6 text-base leading-8 text-stone-600">&ldquo;{testimonial.quote}&rdquo;</blockquote>
            </figure>
          ))}
        </div>
      </section>

      <footer className="px-6 pb-12 pt-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 rounded-[2.4rem] border border-stone-200/70 bg-[linear-gradient(135deg,#f3e2c2_0%,#f6eee1_40%,#ffffff_100%)] p-8 shadow-[0_30px_100px_rgba(69,48,17,0.12)] lg:flex-row lg:items-center lg:justify-between lg:p-10">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Start now</div>
            <h2 className="mt-4 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-stone-950">
              Research faster. Position better. Launch with a premium level of clarity.
            </h2>
            <p className="mt-4 text-base leading-8 text-stone-600">
              Use AI Cofounder to turn raw startup ambition into a sharper offer, stronger evidence, and a better first impression.
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
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(20,18,16,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-900"
            >
              Get started free
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
