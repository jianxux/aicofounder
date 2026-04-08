"use client";

import { useEffect, useState } from "react";
import type { ResearchReport as ResearchReportData } from "@/lib/research";

type ResearchReportProps = {
  status: "empty" | "loading" | "success" | "error";
  report?: ResearchReportData | null;
  errorMessage?: string;
  lastUpdatedAt?: string;
  researchQuestion?: string;
  sourceContext?: string;
  onRunResearch?: () => void;
};

function getRelevanceClasses(relevance: "high" | "medium" | "low") {
  if (relevance === "high") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (relevance === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-stone-200 text-stone-600";
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ResearchSummary({
  status,
  errorMessage,
  lastUpdatedAt,
  researchQuestion,
  sourceContext,
  onRunResearch,
}: Omit<ResearchReportProps, "report">) {
  const buttonLabel = status === "success" ? "Run again" : "Run deep research";

  return (
    <section className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Deep research workspace
            </div>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">Market research report</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Launch a research run from the workspace and keep the latest report attached to this project.
            </p>
          </div>
          <button
            type="button"
            onClick={onRunResearch}
            disabled={status === "loading" || !onRunResearch}
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {status === "loading" ? "Researching..." : buttonLabel}
          </button>
        </div>

        {status === "empty" ? (
          <p className="rounded-3xl border border-dashed border-stone-300 bg-white px-4 py-4 text-sm leading-6 text-stone-600">
            No deep research report yet. Run a workspace research pass to analyze opportunities, risks, and evidence.
          </p>
        ) : null}

        {status === "loading" ? (
          <div
            className="rounded-3xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900"
            aria-live="polite"
          >
            Generating a fresh research report for this project.
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900">
            {errorMessage ?? "Deep research failed. Please try again."}
          </div>
        ) : null}

        {researchQuestion ? (
          <div className="rounded-3xl bg-white px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Research question</div>
            <p className="mt-2 text-sm leading-6 text-stone-700">{researchQuestion}</p>
            {sourceContext ? (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Research context
                </div>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-stone-600">{sourceContext}</p>
              </>
            ) : null}
            {lastUpdatedAt ? (
              <p className="mt-4 text-xs leading-5 text-stone-500">Last updated {formatTimestamp(lastUpdatedAt)}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ResearchReport({
  status,
  report,
  errorMessage,
  lastUpdatedAt,
  researchQuestion,
  sourceContext,
  onRunResearch,
}: ResearchReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!report) {
      setExpandedSections({});
      return;
    }

    setExpandedSections((current) => ({
      ...Object.fromEntries(report.sections.map((section) => [section.id, true])),
      ...current,
    }));
  }, [report]);

  return (
    <div className="space-y-4">
      <ResearchSummary
        status={status}
        errorMessage={errorMessage}
        lastUpdatedAt={lastUpdatedAt}
        researchQuestion={researchQuestion ?? report?.researchQuestion}
        sourceContext={sourceContext}
        onRunResearch={onRunResearch}
      />

      {status === "success" && report ? (
        <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Deep research</div>
            <p className="mt-2 text-sm font-medium text-stone-600">{report.researchQuestion}</p>
            <div className="mt-4 rounded-3xl bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Executive summary</div>
              <div className="mt-3 space-y-3">
                {report.executiveSummary.split(/\n+/).map((paragraph, index) =>
                  paragraph.trim() ? (
                    <p key={`summary-${index + 1}`} className="text-sm leading-6 text-stone-700">
                      {paragraph.trim()}
                    </p>
                  ) : null,
                )}
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Research conducted {formatTimestamp(report.generatedAt)}
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {report.sections.map((section) => {
              const isExpanded = expandedSections[section.id] ?? true;

              return (
                <article key={section.id} className="rounded-3xl border border-stone-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((current) => ({
                        ...current,
                        [section.id]: !isExpanded,
                      }))
                    }
                    className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <h3 className="text-base font-semibold text-stone-950">{section.title}</h3>
                      <div className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                        {section.angle}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-stone-500">{isExpanded ? "Hide" : "Show"}</span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4">
                      <div className="space-y-3">
                        {section.findings.split(/\n+/).map((paragraph, index) =>
                          paragraph.trim() ? (
                            <p key={`${section.id}-finding-${index + 1}`} className="text-sm leading-6 text-stone-700">
                              {paragraph.trim()}
                            </p>
                          ) : null,
                        )}
                      </div>

                      <div className="mt-5 border-t border-stone-200 pt-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Citations</div>
                        <div className="mt-3 space-y-3">
                          {section.citations.map((citation) => (
                            <div key={citation.id} className="rounded-3xl bg-[#fcfaf6] px-4 py-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-medium text-stone-800">{citation.source}</p>
                                  <p className="mt-1 text-sm leading-6 text-stone-600">{citation.claim}</p>
                                  {citation.url ? (
                                    <a
                                      href={citation.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-2 inline-block text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4"
                                    >
                                      {citation.url}
                                    </a>
                                  ) : null}
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getRelevanceClasses(
                                    citation.relevance,
                                  )}`}
                                >
                                  {citation.relevance} relevance
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
