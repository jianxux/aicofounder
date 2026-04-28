"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ProjectArtifactType } from "@/lib/types";

type ArtifactRefinementFormProps = {
  artifactType: ProjectArtifactType;
  isLoading: boolean;
  onSubmit: (message: string) => void;
};

type ValidationFields = {
  strongestSignal: string;
  biggestRisk: string;
  score: string;
  confidence: string;
  simulatedCustomerFeedback: string;
  nextValidationStep: string;
};

type ResearchFields = {
  contradictionToResolve: string;
  missingEvidence: string;
  targetUserQuestion: string;
  nextResearchQuestion: string;
};

const emptyValidationFields = (): ValidationFields => ({
  strongestSignal: "",
  biggestRisk: "",
  score: "",
  confidence: "",
  simulatedCustomerFeedback: "",
  nextValidationStep: "",
});

const emptyResearchFields = (): ResearchFields => ({
  contradictionToResolve: "",
  missingEvidence: "",
  targetUserQuestion: "",
  nextResearchQuestion: "",
});

function hasAnyValue(fields: Record<string, string>) {
  return Object.values(fields).some((value) => value.trim());
}

function buildValidationRefinementMessage(fields: ValidationFields) {
  const lines = [
    fields.strongestSignal.trim() ? `Strongest signal: ${fields.strongestSignal.trim()}` : null,
    fields.biggestRisk.trim() ? `Biggest risk: ${fields.biggestRisk.trim()}` : null,
    fields.score.trim() ? `Score: ${fields.score.trim()}` : null,
    fields.confidence.trim() ? `Confidence: ${fields.confidence.trim()}` : null,
    fields.simulatedCustomerFeedback.trim()
      ? `Simulated customer feedback: ${fields.simulatedCustomerFeedback.trim()}`
      : null,
    fields.nextValidationStep.trim() ? `Next validation step: ${fields.nextValidationStep.trim()}` : null,
  ].filter(Boolean);

  return [`Refine the validation scorecard with this update:`, ...lines].join("\n");
}

function buildResearchRefinementMessage(fields: ResearchFields) {
  const lines = [
    fields.contradictionToResolve.trim()
      ? `Contradiction to resolve: ${fields.contradictionToResolve.trim()}`
      : null,
    fields.missingEvidence.trim() ? `Missing evidence: ${fields.missingEvidence.trim()}` : null,
    fields.targetUserQuestion.trim() ? `Target user question: ${fields.targetUserQuestion.trim()}` : null,
    fields.nextResearchQuestion.trim() ? `Next research question: ${fields.nextResearchQuestion.trim()}` : null,
  ].filter(Boolean);

  return [`Refine the customer research memo with this update:`, ...lines].join("\n");
}

export default function ArtifactRefinementForm({
  artifactType,
  isLoading,
  onSubmit,
}: ArtifactRefinementFormProps) {
  const [validationFields, setValidationFields] = useState<ValidationFields>(emptyValidationFields);
  const [researchFields, setResearchFields] = useState<ResearchFields>(emptyResearchFields);

  useEffect(() => {
    setValidationFields(emptyValidationFields());
    setResearchFields(emptyResearchFields());
  }, [artifactType]);

  const isValidation = artifactType === "validation-scorecard";
  const currentFields = isValidation ? validationFields : researchFields;
  const canSubmit = !isLoading && hasAnyValue(currentFields);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(
      isValidation
        ? buildValidationRefinementMessage(validationFields)
        : buildResearchRefinementMessage(researchFields),
    );
    setValidationFields(emptyValidationFields());
    setResearchFields(emptyResearchFields());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-3xl border border-stone-200 bg-[#fcfaf6] p-4"
      aria-label="Structured refinement"
    >
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Refine mode</div>
        <p className="text-sm leading-6 text-stone-600">
          {isValidation
            ? "Submit focused scorecard updates without losing the freeform chat path."
            : "Capture the exact research gap or contradiction you want the memo to resolve next."}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {isValidation ? (
          <>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
              Strongest signal
              <input
                value={validationFields.strongestSignal}
                onChange={(event) =>
                  setValidationFields((current) => ({ ...current, strongestSignal: event.target.value }))
                }
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
              Biggest risk
              <input
                value={validationFields.biggestRisk}
                onChange={(event) =>
                  setValidationFields((current) => ({ ...current, biggestRisk: event.target.value }))
                }
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
              Score
              <input
                value={validationFields.score}
                onChange={(event) => setValidationFields((current) => ({ ...current, score: event.target.value }))}
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
              Confidence
              <input
                value={validationFields.confidence}
                onChange={(event) =>
                  setValidationFields((current) => ({ ...current, confidence: event.target.value }))
                }
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 sm:col-span-2">
              Simulated customer feedback
              <textarea
                value={validationFields.simulatedCustomerFeedback}
                onChange={(event) =>
                  setValidationFields((current) => ({
                    ...current,
                    simulatedCustomerFeedback: event.target.value,
                  }))
                }
                disabled={isLoading}
                className="min-h-20 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 sm:col-span-2">
              Next validation step
              <textarea
                value={validationFields.nextValidationStep}
                onChange={(event) =>
                  setValidationFields((current) => ({ ...current, nextValidationStep: event.target.value }))
                }
                disabled={isLoading}
                className="min-h-20 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
              Contradiction to resolve
              <input
                value={researchFields.contradictionToResolve}
                onChange={(event) =>
                  setResearchFields((current) => ({ ...current, contradictionToResolve: event.target.value }))
                }
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
              Missing evidence
              <input
                value={researchFields.missingEvidence}
                onChange={(event) =>
                  setResearchFields((current) => ({ ...current, missingEvidence: event.target.value }))
                }
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
              Target user question
              <input
                value={researchFields.targetUserQuestion}
                onChange={(event) =>
                  setResearchFields((current) => ({ ...current, targetUserQuestion: event.target.value }))
                }
                disabled={isLoading}
                className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-stone-700 sm:col-span-2">
              Next research question
              <textarea
                value={researchFields.nextResearchQuestion}
                onChange={(event) =>
                  setResearchFields((current) => ({ ...current, nextResearchQuestion: event.target.value }))
                }
                disabled={isLoading}
                className="min-h-20 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-800 outline-none transition focus:border-stone-400"
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-stone-500">Freeform chat stays available below.</p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-full bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          Submit structured refinement
        </button>
      </div>
    </form>
  );
}
