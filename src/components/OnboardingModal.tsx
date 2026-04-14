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
const STARTER_BRIEFS: Array<OnboardingIntake & { title: string; summary: string; expectedOutputs: string[] }> = [
  {
    title: "Customer research copilot",
    summary: "Turn interview notes and market links into next-step validation plans.",
    expectedOutputs: [
      "A founder-ready validation brief with the sharpest problem to test first.",
      "A shortlist of interview themes and follow-up questions worth pursuing.",
      "A concrete next-step plan for research, synthesis, and early product scoping.",
    ],
    primaryIdea:
      "An AI research copilot that turns scattered founder notes, interview transcripts, and saved links into a clear validation brief with prioritized next steps.",
    url: "",
    targetUser: "Pre-seed founders validating a new B2B SaaS idea",
    mainUncertainty: "Will founders trust an AI-generated brief enough to use it before talking to more customers?",
  },
  {
    title: "Ops assistant for clinics",
    summary: "Reduce admin churn for small care teams handling scheduling and follow-up.",
    expectedOutputs: [
      "A workflow brief showing where scheduling and no-show recovery can be automated.",
      "A target user snapshot for the clinic team that feels the pain most acutely.",
      "A first-pass wedge and success metric to validate with real operators.",
    ],
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
    expectedOutputs: [
      "A demand-planning brief centered on the highest-value inventory decision.",
      "A clearer view of which operator persona owns forecasting and reorders today.",
      "An action-oriented hypothesis for forecasting, reorder timing, and stockout prevention.",
    ],
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

function normalizeIntakeValue(value?: string) {
  return value?.trim() ?? "";
}

function normalizeIntake(intake?: Partial<OnboardingIntake>) {
  return {
    primaryIdea: normalizeIntakeValue(intake?.primaryIdea),
    url: normalizeIntakeValue(intake?.url),
    targetUser: normalizeIntakeValue(intake?.targetUser),
    mainUncertainty: normalizeIntakeValue(intake?.mainUncertainty),
  };
}

function intakeValuesMatch(a: OnboardingIntake, b: OnboardingIntake) {
  return (
    a.primaryIdea === b.primaryIdea &&
    a.url === b.url &&
    a.targetUser === b.targetUser &&
    a.mainUncertainty === b.mainUncertainty
  );
}

function findMatchingStarterIndex(intake?: Partial<OnboardingIntake>) {
  if (!intake) {
    return null;
  }

  const normalizedIntake = normalizeIntake(intake);

  const matchIndex = STARTER_BRIEFS.findIndex((starter) => {
    return (
      starter.primaryIdea === normalizedIntake.primaryIdea &&
      starter.url === normalizedIntake.url &&
      starter.targetUser === normalizedIntake.targetUser &&
      starter.mainUncertainty === normalizedIntake.mainUncertainty
    );
  });

  return matchIndex >= 0 ? matchIndex : null;
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
  const starterOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousNormalizedInitialIntakeRef = useRef<OnboardingIntake>(normalizeIntake());
  const previousOpenRef = useRef(false);
  const isPrimaryIdeaValid = primaryIdea.trim().length > 0;
  const titleIdForStep = (stepNumber: number) => `${dialogId}-title-${stepNumber}`;
  const descriptionIdForStep = (stepNumber: number) => `${dialogId}-description-${stepNumber}`;

  const clearSelectedStarter = () => {
    setSelectedStarterIndex(null);
  };

  const applyStarterSelection = (index: number) => {
    const starter = STARTER_BRIEFS[index];
    setSelectedStarterIndex(index);
    setPrimaryIdea(starter.primaryIdea);
    setUrl(starter.url);
    setTargetUser(starter.targetUser);
    setMainUncertainty(starter.mainUncertainty);
  };

  useEffect(() => {
    const normalizedInitialIntake = normalizeIntake(initialIntake);
    const initialIntakeChanged = !intakeValuesMatch(
      previousNormalizedInitialIntakeRef.current,
      normalizedInitialIntake,
    );
    const wasOpen = previousOpenRef.current;

    if (open) {
      if (!wasOpen || initialIntakeChanged) {
        setStep(normalizedInitialIntake.primaryIdea ? 2 : 1);
        setPrimaryIdea(normalizedInitialIntake.primaryIdea);
        setUrl(normalizedInitialIntake.url);
        setTargetUser(normalizedInitialIntake.targetUser);
        setMainUncertainty(normalizedInitialIntake.mainUncertainty);
        setSelectedStarterIndex(findMatchingStarterIndex(normalizedInitialIntake));
      }
    } else {
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
    }

    previousNormalizedInitialIntakeRef.current = normalizedInitialIntake;
    previousOpenRef.current = open;
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

  const handleStarterKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = STARTER_BRIEFS.length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = index === lastIndex ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = index === 0 ? lastIndex : index - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    applyStarterSelection(nextIndex);
    starterOptionRefs.current[nextIndex]?.focus();
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
                <div role="radiogroup" aria-label="Starter briefs" className="mt-4 grid gap-3 sm:grid-cols-3">
                  {STARTER_BRIEFS.map((starter, index) => {
                    const isSelected = selectedStarterIndex === index;
                    const starterTitleId = `${dialogId}-starter-title-${index}`;
                    const starterDescriptionId = `${dialogId}-starter-description-${index}`;

                    return (
                    <button
                      key={starter.title}
                      ref={(element) => {
                        starterOptionRefs.current[index] = element;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-labelledby={starterTitleId}
                      aria-describedby={starterDescriptionId}
                      tabIndex={selectedStarterIndex === null ? (index === 0 ? 0 : -1) : isSelected ? 0 : -1}
                      onClick={() => applyStarterSelection(index)}
                      onKeyDown={(event) => handleStarterKeyDown(event, index)}
                      className={`rounded-[24px] border p-4 text-left transition focus-visible:outline-none ${
                        isSelected
                          ? "border-stone-900 bg-stone-950 text-white shadow-[0_0_0_3px_rgba(28,25,23,0.12)]"
                          : "border-stone-200 bg-[#fcfbf8] hover:border-stone-400 hover:bg-white focus-visible:border-stone-500"
                      }`}
                    >
                      <div
                        id={starterTitleId}
                        className={`text-sm font-semibold ${isSelected ? "text-white" : "text-stone-900"}`}
                      >
                        {starter.title}
                      </div>
                      <div id={starterDescriptionId}>
                        <p className={`mt-2 text-sm leading-6 ${isSelected ? "text-stone-100" : "text-stone-600"}`}>
                          {starter.summary}
                        </p>
                        <div className="mt-4">
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            isSelected ? "text-stone-300" : "text-stone-500"
                          }`}
                        >
                          You&apos;ll leave with
                        </div>
                        <ul
                          className={`mt-2 space-y-1.5 text-xs leading-5 ${
                            isSelected ? "text-stone-100" : "text-stone-600"
                          }`}
                        >
                          {starter.expectedOutputs.map((output) => (
                            <li key={output} className="flex items-start gap-2">
                              <span aria-hidden="true" className={isSelected ? "text-stone-300" : "text-stone-400"}>
                                •
                              </span>
                              <span>{output}</span>
                            </li>
                          ))}
                        </ul>
                        </div>
                      </div>
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
