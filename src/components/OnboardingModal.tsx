"use client";

import { useEffect, useId, useState } from "react";

type OnboardingModalProps = {
  open: boolean;
  onComplete: (name: string, description: string) => void;
  onSkip: () => void;
};

const TOTAL_STEPS = 3;

export default function OnboardingModal({ open, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const isNameValid = name.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setName("");
      setDescription("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-2xl rounded-[32px] border border-stone-200/80 bg-[#faf7f2] p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Getting Started
          </div>
          <button
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
          >
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Step 1</p>
            <h2
              id={titleId}
              className="mt-4 text-4xl text-stone-950 [font-family:Georgia,'Times_New_Roman',serif]"
            >
              Welcome to AI Cofounder
            </h2>
            <p id={descriptionId} className="mt-5 max-w-xl text-base leading-8 text-stone-600">
              Turn a raw idea into a structured company-building plan. Your AI cofounder will help
              you clarify the problem, shape the roadmap, and move through each phase.
            </p>
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
          >
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Step 2</p>
            <h2 className="mt-4 text-4xl text-stone-950 [font-family:Georgia,'Times_New_Roman',serif]">
              About Your Idea
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">
              Give your project a name and describe the problem you want to solve.
            </p>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Project name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Founder Insight Engine"
                  className="mt-2 w-full rounded-[24px] border border-stone-200 bg-white px-5 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">What problem are you solving?</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Founders struggle to organize research, make decisions, and keep momentum across the earliest phases."
                  rows={5}
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
                disabled={!isNameValid}
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
          >
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Step 3</p>
            <h2 className="mt-4 text-4xl text-stone-950 [font-family:Georgia,'Times_New_Roman',serif]">
              Ready to Launch
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">
              Here’s what you’re starting with. Once launched, your AI cofounder will guide you
              through the discovery, planning, build, and launch phases.
            </p>

            <div className="mt-8 rounded-[28px] border border-stone-200 bg-white/90 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                Project Summary
              </div>
              <div className="mt-4 text-2xl font-semibold text-stone-950">{name.trim()}</div>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                {description.trim() || "You can refine the problem statement once you enter the workspace."}
              </p>
            </div>

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
                onClick={() => onComplete(name.trim(), description.trim())}
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
  );
}
