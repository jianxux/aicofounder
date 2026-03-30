"use client";

import { useState } from "react";
import type { ResearchReport } from "@/lib/research";

type ResearchReportProps = {
  report: ResearchReport;
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

export default function ResearchReport({ report }: ResearchReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(report.sections.map((section) => [section.id, true])),
  );

  return (
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
  );
}
