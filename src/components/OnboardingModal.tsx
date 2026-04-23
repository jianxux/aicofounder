"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { summarizeIntakeAttachmentPolicy } from "@/lib/intake-attachment-policy";

export type OnboardingIntake = {
  primaryIdea: string;
  url: string;
  targetUser: string;
  mainUncertainty: string;
};

type OnboardingModalProps = {
  open: boolean;
  onComplete: (intake: OnboardingIntake) => void;
  onSkip: () => void;
  initialIntake?: Partial<OnboardingIntake>;
};

type OnboardingStep = 1 | 2 | 3;

const TOTAL_STEPS = 3;
const STARTER_BRIEFS: Array<OnboardingIntake & { title: string; summary: string }> = [
  {
    title: "Customer research copilot",
    summary: "Turn interview notes and market links into next-step validation plans.",
    primaryIdea:
      "An AI research copilot that turns scattered founder notes, interview transcripts, and saved links into a clear validation brief with prioritized next steps.",
    url: "",
    targetUser: "Pre-seed founders validating a new B2B SaaS idea",
    mainUncertainty: "Will founders trust an AI-generated brief enough to use it before talking to more customers?",
  },
  {
    title: "Ops assistant for clinics",
    summary: "Reduce admin churn for small care teams handling scheduling and follow-up.",
    primaryIdea:
      "A workflow assistant for independent clinics that automates patient scheduling follow-ups, no-show recovery, and front-desk task handoffs.",
    url: "",
    targetUser: "Practice managers at independent primary care clinics",
    mainUncertainty:
      "Is the biggest wedge missed appointments, or do clinic teams care more about reducing manual coordination across channels?",
  },
  {
    title: "Retail demand planner",
    summary: "Help small brands reorder inventory with less guesswork.",
    primaryIdea:
      "A lightweight planning tool that helps Shopify brands forecast demand, time reorders, and spot risky stockouts before bestsellers go out of stock.",
    url: "",
    targetUser: "Operators at small e-commerce brands doing $1M-$10M in annual revenue",
    mainUncertainty:
      "Would operators switch from spreadsheets for better forecasting alone, or only if the tool also recommends concrete reorder actions?",
  },
];
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");
const STRONG_IDEA_MIN_WORDS = 6;

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export default function OnboardingModal({ open, onComplete, onSkip, initialIntake }: OnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [primaryIdea, setPrimaryIdea] = useState("");
  const [url, setUrl] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [mainUncertainty, setMainUncertainty] = useState("");
  const [selectedStarterIndex, setSelectedStarterIndex] = useState<number | null>(null);
  const attachmentPolicySummary = summarizeIntakeAttachmentPolicy();
  const dialogId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement | null>(null);
  const stepOneHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const primaryIdeaInputRef = useRef<HTMLTextAreaElement | null>(null);
  const stepThreeHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const isPrimaryIdeaValid = primaryIdea.trim().length > 0;
  const hasConcreteIdeaSignal = countWords(primaryIdea) >= STRONG_IDEA_MIN_WORDS;
  const hasTargetUserSignal = targetUser.trim().length > 0;
  const hasMainUncertaintySignal = mainUncertainty.trim().length > 0;
  const hasReferenceUrlSignal = url.trim().length > 0;
  const intakeSignals = [
    {
      label: "Concrete idea or workflow",
      present: hasConcreteIdeaSignal,
      hint: `More than a few words helps. Aim for at least ${STRONG_IDEA_MIN_WORDS} words.`,
    },
    {
      label: "Target user named",
      present: hasTargetUserSignal,
      hint: "Name the customer or operator you want to help.",
    },
    {
      label: "Main uncertainty named",
      present: hasMainUncertaintySignal,
      hint: "Call out the risk, assumption, or decision you need to test.",
    },
    {
      label: "Reference URL added",
      present: hasReferenceUrlSignal,
      hint: "Optional but helpful for a product, market, or workflow reference.",
    },
  ] as const;
  const presentSignalCount = intakeSignals.filter((signal) => signal.present).length;
  const intakeGuideSummary =
    presentSignalCount <= 1
      ? "Early signal only. Add a sharper idea, target user, or uncertainty so the first brief has more to work from."
      : presentSignalCount <= 3
        ? "Promising signal. You have a workable intake; one more detail would make the first brief more specific."
        : "Strong signal. This looks complete enough for a more grounded first brief, but it is still only a rough intake check.";
  const titleIdForStep = (stepNumber: number) => `${dialogId}-title-${stepNumber}`;
  const descriptionIdForStep = (stepNumber: number) => `${dialogId}-description-${stepNumber}`;

  const clearSelectedStarter = () => {
    setSelectedStarterIndex(null);
  };

  useEffect(() => {
    if (open) {
      const nextPrimaryIdea = initialIntake?.primaryIdea?.trim() ?? "";
      setStep(nextPrimaryIdea ? 2 : 1);
      setPrimaryIdea(nextPrimaryIdea);
      setUrl(initialIntake?.url?.trim() ?? "");
      setTargetUser(initialIntake?.targetUser?.trim() ?? "");
      setMainUncertainty(initialIntake?.mainUncertainty?.trim() ?? "");
      setSelectedStarterIndex(null);
      return;
    }

    if (previouslyFocusedElementRef.current && previouslyFocusedElementRef.current.isConnected) {
      previouslyFocusedElementRef.current.focus();
    }
    previouslyFocusedElementRef.current = null;
    setStep(1);
    setPrimaryIdea("");
    setUrl("");
    setTargetUser("");
    setMainUncertainty("");
    setSelectedStarterIndex(null);
  }, [initialIntake, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const focusTarget =
      skipButtonRef.current ??
      (dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialogRef.current);

    focusTarget?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTargetByStep = {
      1: stepOneHeadingRef.current,
      2: primaryIdeaInputRef.current,
      3: stepThreeHeadingRef.current,
    } as const;

    const focusTarget =
      focusTargetByStep[step] ??
      (dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialogRef.current);

    focusTarget?.focus();
  }, [open, step]);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      (element) =>
        !element.closest("[hidden]") && !element.closest("[aria-hidden='true']"),
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (!activeElement || !dialogRef.current.contains(activeElement)) {
      event.preventDefault();
      firstElement.focus();
      return;
    }

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/30 px-4 py-8 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleIdForStep(step)}
          aria-describedby={descriptionIdForStep(step)}
          tabIndex={-1}
          onKeyDown={handleDialogKeyDown}
          className="my-auto w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-[32px] border border-stone-200/80 bg-[#faf7f2] p-6 shadow-2xl sm:p-8"
        >
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Getting Started
          </div>
          <button
            ref={skipButtonRef}
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-stone-500 transition hover:text-stone-800"
          >
            Skip
          </button>
        </div>

        <div className="relative mt-6 min-h-[340px] overflow-hidden">
          <section
            className={`transition-all duration-300 ${
              step === 1
                ? "translate-x-0 opacity-100"
                : "pointer-events-none absolute inset-0 -translate-x-4 opacity-0"
            }`}
            aria-hidden={step !== 1}
            hidden={step !== 1}
          >
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Step 1</p>
            <h2
              id={titleIdForStep(1)}
              ref={stepOneHeadingRef}
              tabIndex={-1}
              className="mt-4 text-4xl text-stone-950 [font-family:Georgia,'Times_New_Roman',serif]"
            >
              Welcome to AI Cofounder
            </h2>
            <p id={descriptionIdForStep(1)} className="mt-5 max-w-xl text-base leading-8 text-stone-600">
              Start with a focused first session built to turn rough founder notes into something
              you can act on. Before you begin, here is what you will walk away with.
            </p>
            <section
              aria-label="First session deliverables"
              className="mt-8 rounded-[28px] border border-stone-200 bg-white/90 p-6"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                First Session Preview
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                You will leave with a sharper brief for your startup idea and a clear starting point
                for the next phase.
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-stone-700">
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-1 text-stone-400">
                    01
                  </span>
                  <span>A concise problem statement grounded in the founder idea you provide.</span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-1 text-stone-400">
                    02
                  </span>
                  <span>A target user and core assumption to validate first.</span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="mt-1 text-stone-400">
                    03
                  </span>
                  <span>A recommended next-step plan for discovery, planning, and build.</span>
                </li>
              </ul>
            </section>
            <div className="mt-10">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Get Started
              </button>
            </div>
          </section>

          <section
            className={`transition-all duration-300 ${
              step === 2
                ? "translate-x-0 opacity-100"
                : "pointer-events-none absolute inset-0 translate-x-4 opacity-0"
            }`}
            aria-hidden={step !== 2}
            hidden={step !== 2}
          >
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Step 2</p>
            <h2
              id={titleIdForStep(2)}
              className="mt-4 text-4xl text-stone-950 [font-family:Georgia,'Times_New_Roman',serif]"
            >
              About Your Idea
            </h2>
            <p id={descriptionIdForStep(2)} className="mt-5 max-w-xl text-base leading-8 text-stone-600">
              Start with one clear idea. Add a URL, target user, or the main uncertainty only if
              they help sharpen the brief.
            </p>

            <div className="mt-8 space-y-5">
              <section
                aria-label="Starter briefs"
                className="rounded-[28px] border border-stone-200/90 bg-white/80 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Starter briefs
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                      Not sure where to start? Pick an example and edit it to match your idea.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {STARTER_BRIEFS.map((starter, index) => {
                    const isSelected = selectedStarterIndex === index;

                    return (
                    <button
                      key={starter.title}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedStarterIndex(index);
                        setPrimaryIdea(starter.primaryIdea);
                        setUrl(starter.url);
                        setTargetUser(starter.targetUser);
                        setMainUncertainty(starter.mainUncertainty);
                      }}
                      className={`rounded-[24px] border p-4 text-left transition focus-visible:outline-none ${
                        isSelected
                          ? "border-stone-900 bg-stone-950 text-white shadow-[0_0_0_3px_rgba(28,25,23,0.12)]"
                          : "border-stone-200 bg-[#fcfbf8] hover:border-stone-400 hover:bg-white focus-visible:border-stone-500"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${isSelected ? "text-white" : "text-stone-900"}`}>
                        {starter.title}
                      </div>
                      <p className={`mt-2 text-sm leading-6 ${isSelected ? "text-stone-100" : "text-stone-600"}`}>
                        {starter.summary}
                      </p>
                    </button>
                    );
                  })}
                </div>
              </section>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">What are you thinking about building?</span>
                <textarea
                  ref={primaryIdeaInputRef}
                  value={primaryIdea}
                  onChange={(event) => {
                    clearSelectedStarter();
                    setPrimaryIdea(event.target.value);
                  }}
                  placeholder="An AI copilot that helps founders turn scattered research, URLs, and notes into a concrete validation plan."
                  rows={5}
                  className="mt-2 w-full rounded-[24px] border border-stone-200 bg-white px-5 py-4 text-sm leading-7 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Relevant URL (optional)</span>
                <input
                  type="url"
                  value={url}
                  onChange={(event) => {
                    clearSelectedStarter();
                    setUrl(event.target.value);
                  }}
                  placeholder="https://example.com"
                  className="mt-2 w-full rounded-[24px] border border-stone-200 bg-white px-5 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Target user (optional)</span>
                <input
                  value={targetUser}
                  onChange={(event) => {
                    clearSelectedStarter();
                    setTargetUser(event.target.value);
                  }}
                  placeholder="Seed-stage B2B SaaS founders"
                  className="mt-2 w-full rounded-[24px] border border-stone-200 bg-white px-5 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Main uncertainty (optional)</span>
                <textarea
                  value={mainUncertainty}
                  onChange={(event) => {
                    clearSelectedStarter();
                    setMainUncertainty(event.target.value);
                  }}
                  placeholder="I’m not sure whether founders want one workspace for synthesis or separate tools for each step."
                  rows={3}
                  className="mt-2 w-full rounded-[24px] border border-stone-200 bg-white px-5 py-4 text-sm leading-7 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                />
              </label>

              <section
                aria-label="Intake quality guide"
                className="rounded-[28px] border border-stone-200/90 bg-[#f5efe5] p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div role="status" aria-live="polite" aria-atomic="true">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Intake quality guide
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-700">
                      Rough completeness signal: {presentSignalCount} of 4 signals present.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{intakeGuideSummary}</p>
                  </div>
                  <div
                    aria-hidden="true"
                    className="rounded-full border border-stone-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600"
                  >
                    {presentSignalCount <= 1
                      ? "Early signal"
                      : presentSignalCount <= 3
                        ? "Promising signal"
                        : "Strong signal"}
                  </div>
                </div>

                <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                  {intakeSignals.map((signal) => (
                    <li
                      key={signal.label}
                      className="flex items-start gap-3 rounded-[20px] border border-stone-200/80 bg-white/80 px-4 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                          signal.present
                            ? "bg-stone-900 text-white"
                            : "border border-stone-300 bg-transparent text-stone-500"
                        }`}
                      >
                        {signal.present ? "✓" : " "}
                      </span>
                      <span>
                        <span className="font-medium text-stone-900">
                          {signal.label}
                          <span className="sr-only">: {signal.present ? "present" : "missing"}</span>
                        </span>
                        <span className="block text-stone-600">{signal.present ? "Present" : "Missing"}</span>
                        <span className="block text-stone-600">{signal.hint}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!isPrimaryIdeaValid}
                onClick={() => setStep(3)}
                className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                Continue
              </button>
            </div>
          </section>

          <section
            className={`transition-all duration-300 ${
              step === 3
                ? "translate-x-0 opacity-100"
                : "pointer-events-none absolute inset-0 translate-x-4 opacity-0"
            }`}
            aria-hidden={step !== 3}
            hidden={step !== 3}
          >
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Step 3</p>
            <h2
              id={titleIdForStep(3)}
              ref={stepThreeHeadingRef}
              tabIndex={-1}
              className="mt-4 text-4xl text-stone-950 [font-family:Georgia,'Times_New_Roman',serif]"
            >
              Ready to Launch
            </h2>
            <p id={descriptionIdForStep(3)} className="mt-5 max-w-xl text-base leading-8 text-stone-600">
              Here’s what you’re starting with. Once launched, your AI cofounder will guide you
              through the discovery, planning, build, and launch phases.
            </p>

            <div className="mt-8 rounded-[28px] border border-stone-200 bg-white/90 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                Intake Summary
              </div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Primary idea</div>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                {primaryIdea.trim() || "Add your core idea to continue."}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">URL</div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{url.trim() || "Not provided"}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Target user</div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{targetUser.trim() || "Not provided"}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Main uncertainty
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {mainUncertainty.trim() || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            <section className="mt-5 rounded-[28px] border border-amber-200 bg-amber-50/80 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">
                Attachments Coming Soon
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                File uploads are not available in first-run intake yet. These limits and privacy
                rules set expectations before launch.
              </p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
                {attachmentPolicySummary.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span aria-hidden="true" className="text-amber-700">
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  onComplete({
                    primaryIdea: primaryIdea.trim(),
                    url: url.trim(),
                    targetUser: targetUser.trim(),
                    mainUncertainty: mainUncertainty.trim(),
                  })
                }
                className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Launch Project
              </button>
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" aria-label="Step indicator">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === step;

            return (
              <span
                key={stepNumber}
                aria-label={`Step ${stepNumber}${isActive ? " current" : ""}`}
                className={`h-2.5 rounded-full transition-all ${
                  isActive ? "w-8 bg-stone-950" : "w-2.5 bg-stone-300"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  </div>
  );
}
