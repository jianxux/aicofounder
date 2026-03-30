"use client";

import { BrainstormResult } from "@/lib/brainstorm";

type BrainstormResultsProps = {
  result: BrainstormResult;
};

function getSeverityColor(severity: number) {
  if (severity <= 2) {
    return "bg-emerald-500";
  }

  if (severity === 3) {
    return "bg-amber-400";
  }

  if (severity === 4) {
    return "bg-orange-500";
  }

  return "bg-rose-500";
}

export default function BrainstormResults({ result }: BrainstormResultsProps) {
  return (
    <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="rounded-3xl bg-[#fcfaf6] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
          Brainstormed pain points
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-700">{result.summary}</p>
        <p className="mt-3 text-xs leading-5 text-stone-500">{result.searchContext}</p>
      </div>

      <div className="mt-4 space-y-4">
        {result.painPoints.map((painPoint) => (
          <article key={painPoint.id} className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-950">{painPoint.title}</h3>
                <div className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                  {painPoint.source}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-500">
                <div className="flex items-center gap-1" aria-label={`Severity ${painPoint.severity} out of 5`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      key={`${painPoint.id}-${index + 1}`}
                      className={`h-2.5 w-2.5 rounded-full ${
                        index < painPoint.severity ? getSeverityColor(painPoint.severity) : "bg-stone-200"
                      }`}
                    />
                  ))}
                </div>
                <span>{painPoint.frequency}</span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-stone-700">{painPoint.description}</p>

            <details className="mt-4 rounded-3xl bg-[#fcfaf6] px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-stone-700">
                Complaint quotes
              </summary>
              <div className="mt-3 space-y-3">
                {painPoint.quotes.map((quote, index) => (
                  <blockquote
                    key={`${painPoint.id}-quote-${index + 1}`}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-600"
                  >
                    "{quote}"
                  </blockquote>
                ))}
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
